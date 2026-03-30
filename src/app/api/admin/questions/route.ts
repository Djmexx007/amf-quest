import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isModerator, isGod } from '@/lib/permissions'

// GET — list questions (pending for modo, all for admin/god)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') // 'pending' | 'active' | 'all'
  const branchId = searchParams.get('branch_id')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage = 20
  const offset = (page - 1) * perPage

  let query = supabaseAdmin
    .from('questions')
    .select('id, question_text, difficulty, category, branch_id, is_active, created_by, created_at, answers(id, answer_text, is_correct, order_index), branches(name, color)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (status === 'pending') {
    query = query.eq('is_active', false)
  } else if (status === 'active') {
    query = query.eq('is_active', true)
  }

  if (branchId) {
    query = query.eq('branch_id', branchId)
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
    game_types: string[]
    explanation: string
    tip?: string
    tags?: string[]
    answers: { answer_text: string; is_correct: boolean }[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { branch_id, question_text, difficulty, game_types, explanation, answers, module_id, context_text, tip, tags } = body

  if (!branch_id || !question_text || !difficulty || !game_types?.length || !explanation) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }
  if (!answers || answers.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 réponses requises.' }, { status: 400 })
  }
  const correctCount = answers.filter(a => a.is_correct).length
  if (correctCount !== 1) {
    return NextResponse.json({ error: 'Exactement 1 réponse correcte requise.' }, { status: 400 })
  }

  // God questions are auto-approved; moderator questions are pending
  const is_active = isGod(payload.role)

  const { data: question, error: qErr } = await supabaseAdmin
    .from('questions')
    .insert({
      branch_id,
      module_id: module_id ?? null,
      question_text,
      context_text: context_text ?? null,
      icon: '❓',
      difficulty,
      game_types,
      explanation,
      tip: tip ?? null,
      tags: tags ?? null,
      is_active,
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
  }))

  const { error: aErr } = await supabaseAdmin.from('answers').insert(answerRows)
  if (aErr) {
    // Rollback question
    await supabaseAdmin.from('questions').delete().eq('id', question.id)
    return NextResponse.json({ error: aErr.message }, { status: 500 })
  }

  // Log the action
  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'create_question',
    details: { question_id: question.id, branch_id, is_active },
  })

  return NextResponse.json({
    question_id: question.id,
    is_active,
    message: is_active
      ? 'Question créée et activée.'
      : 'Question créée — en attente d\'approbation.',
  }, { status: 201 })
}
