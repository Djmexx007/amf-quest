import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isModerator, isGod } from '@/lib/permissions'
import type { QuestionType } from '@/types'

// ── Helpers ────────────────────────────────────────────────────

const QUESTION_SELECT = `
  id, question_text, question_type, difficulty, status, category_id,
  branch_id, is_active, created_by, created_at, game_types,
  explanation, tip,
  answers(id, answer_text, is_correct, order_index),
  branches(name, color),
  question_categories(name, icon, color)
`

/** Returns a map of question_id → requester admin_id for all pending delete requests. */
async function getPendingDeleteMap(): Promise<Map<string, string>> {
  const { data: logs } = await supabaseAdmin
    .from('admin_logs')
    .select('admin_id, action, details, created_at')
    .in('action', ['request_delete_question', 'cancel_delete_question', 'deny_delete_question'])
    .order('created_at', { ascending: false })

  // For each question_id, the MOST RECENT event determines pending status
  const latestByQuestion = new Map<string, { action: string; admin_id: string }>()
  for (const event of logs ?? []) {
    const qid = (event.details as Record<string, string> | null)?.question_id
    if (qid && !latestByQuestion.has(qid)) {
      latestByQuestion.set(qid, { action: event.action, admin_id: event.admin_id })
    }
  }

  const pending = new Map<string, string>()
  for (const [qid, { action, admin_id }] of latestByQuestion) {
    if (action === 'request_delete_question') pending.set(qid, admin_id)
  }
  return pending
}

// GET — list questions with filters
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const statusFilter  = searchParams.get('status')
  const branchId      = searchParams.get('branch_id')
  const gameType      = searchParams.get('game_type')
  const qType         = searchParams.get('question_type')
  const page          = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage       = 20
  const offset        = (page - 1) * perPage
  const deleteRequested = searchParams.get('delete_requested') === 'true'

  // ── delete_requested mode: fetch pending question IDs from admin_logs ──
  if (deleteRequested) {
    const pendingMap = await getPendingDeleteMap()
    const pendingIds = [...pendingMap.keys()]

    if (pendingIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0, page: 1, per_page: perPage })
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .select(QUESTION_SELECT)
      .in('id', pendingIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const enriched = (data ?? []).map(q => ({
      ...q,
      delete_requested_by: pendingMap.get(q.id) ?? null,
    }))

    return NextResponse.json({ questions: enriched, total: enriched.length, page: 1, per_page: perPage })
  }

  // ── Normal paginated mode ──────────────────────────────────────
  let query = supabaseAdmin
    .from('questions')
    .select(QUESTION_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter)
  if (branchId)  query = query.eq('branch_id', branchId)
  if (gameType)  query = query.contains('game_types', [gameType])
  if (qType)     query = query.eq('question_type', qType)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Merge pending delete-request info
  const pendingMap = await getPendingDeleteMap()
  const enriched = (data ?? []).map(q => ({
    ...q,
    delete_requested_by: pendingMap.get(q.id) ?? null,
  }))

  return NextResponse.json({ questions: enriched, total: count ?? 0, page, per_page: perPage })
}

// POST — create a question (moderator+)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: {
    branch_id: string
    module_id?: string
    question_text: string
    context_text?: string
    difficulty: 1 | 2 | 3
    question_type: QuestionType
    game_types: string[]
    category_id?: string
    explanation: string
    tip?: string
    tags?: string[]
    answers: { answer_text: string; is_correct: boolean; answer_metadata?: Record<string, unknown> }[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const {
    branch_id, module_id, question_text, context_text, difficulty,
    question_type = 'mcq', game_types, category_id, explanation, tip, tags, answers,
  } = body

  if (!branch_id || !question_text || !difficulty || !game_types?.length || !explanation) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }
  if (game_types.includes('trivia-crack') && !category_id) {
    return NextResponse.json({ error: 'Une catégorie est requise pour l\'Arène du Savoir.' }, { status: 400 })
  }
  if (game_types.includes('scenario') && !context_text?.trim()) {
    return NextResponse.json({ error: 'Un contexte est requis pour le type Scénario.' }, { status: 400 })
  }
  if (!answers || answers.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 réponses requises.' }, { status: 400 })
  }
  if (['mcq', 'scenario', 'regulation'].includes(question_type)) {
    if (answers.filter(a => a.is_correct).length !== 1) {
      return NextResponse.json({ error: 'Exactement 1 réponse correcte requise.' }, { status: 400 })
    }
  }

  const autoApprove = isGod(payload.role)

  const { data: question, error: qErr } = await supabaseAdmin
    .from('questions')
    .insert({
      branch_id,
      module_id: module_id ?? null,
      question_text,
      context_text: context_text ?? null,
      icon: '❓',
      difficulty,
      question_type,
      game_types,
      category_id: category_id ?? null,
      explanation,
      tip: tip ?? null,
      tags: tags ?? null,
      status: autoApprove ? 'approved' : 'pending',
      is_active: autoApprove,
      approved_by: autoApprove ? payload.sub : null,
      approved_at: autoApprove ? new Date().toISOString() : null,
      created_by: payload.sub,
    })
    .select('id')
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: qErr?.message ?? 'Erreur création question.' }, { status: 500 })
  }

  const answerRows = answers.map((a, i) => ({
    question_id: question.id,
    answer_text: a.answer_text,
    is_correct: a.is_correct,
    order_index: i,
    answer_metadata: a.answer_metadata ?? null,
  }))

  const { error: aErr } = await supabaseAdmin.from('answers').insert(answerRows)
  if (aErr) {
    await supabaseAdmin.from('questions').delete().eq('id', question.id)
    return NextResponse.json({ error: aErr.message }, { status: 500 })
  }

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'create_question',
    details: { question_id: question.id, branch_id, question_type, status: autoApprove ? 'approved' : 'pending' },
  })

  return NextResponse.json({
    question_id: question.id,
    status: autoApprove ? 'approved' : 'pending',
    message: autoApprove ? 'Question créée et approuvée.' : 'Question créée — en attente d\'approbation.',
  }, { status: 201 })
}
