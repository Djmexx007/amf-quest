import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isModerator, isGod } from '@/lib/permissions'
import type { QuestionType } from '@/types'

// GET — list questions with filters
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const statusFilter  = searchParams.get('status')    // 'pending' | 'approved' | 'rejected' | 'all'
  const branchId      = searchParams.get('branch_id')
  const gameType      = searchParams.get('game_type')
  const qType         = searchParams.get('question_type')
  const page          = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage       = 20
  const offset        = (page - 1) * perPage

  const deleteRequested = searchParams.get('delete_requested') === 'true'

  let query = supabaseAdmin
    .from('questions')
    .select(
      `id, question_text, question_type, difficulty, status, category_id,
       branch_id, is_active, created_by, created_at, game_types,
       delete_requested_by, delete_requested_at, explanation, tip,
       answers(id, answer_text, is_correct, order_index),
       branches(name, color),
       question_categories(name, icon, color)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (deleteRequested) {
    query = query.not('delete_requested_by', 'is', null)
  } else if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  if (gameType) {
    query = query.contains('game_types', [gameType])
  }
  if (qType) {
    query = query.eq('question_type', qType)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ questions: data ?? [], total: count ?? 0, page, per_page: perPage })
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

  // Required field validation
  if (!branch_id || !question_text || !difficulty || !game_types?.length || !explanation) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }

  // Trivia requires a category
  if (game_types.includes('trivia-crack') && !category_id) {
    return NextResponse.json({ error: 'Une catégorie est requise pour l\'Arène du Savoir.' }, { status: 400 })
  }

  // Scenario requires context
  if (game_types.includes('scenario') && !context_text?.trim()) {
    return NextResponse.json({ error: 'Un contexte est requis pour le type Scénario.' }, { status: 400 })
  }

  if (!answers || answers.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 réponses requises.' }, { status: 400 })
  }

  // MCQ / scenario / regulation: must have exactly 1 correct
  if (['mcq', 'scenario', 'regulation'].includes(question_type)) {
    const correctCount = answers.filter(a => a.is_correct).length
    if (correctCount !== 1) {
      return NextResponse.json({ error: 'Exactement 1 réponse correcte requise.' }, { status: 400 })
    }
  }

  // God questions are auto-approved; moderator questions are pending
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
