import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isModerator, isGod } from '@/lib/permissions'

const QUESTION_SELECT = `
  id, question, context, answers, correct_answer,
  branch, category, is_scenario,
  created_at, updated_at, times_used, last_used_at
`

// GET — liste paginée des questions (moderator+)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const branch     = searchParams.get('branch')
  const category   = searchParams.get('category')
  const isScenario = searchParams.get('scenario')
  const page       = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage    = 20
  const offset     = (page - 1) * perPage

  let query = supabaseAdmin
    .from('questions')
    .select(QUESTION_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (branch)   query = query.eq('branch', branch)
  if (category) query = query.eq('category', category)
  if (isScenario !== null && isScenario !== '') {
    query = query.eq('is_scenario', isScenario === 'true')
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ questions: data ?? [], total: count ?? 0, page, per_page: perPage })
}

// POST — créer une question (moderator+)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: {
    branch: string
    category: string
    question: string
    context?: string
    answers: string[]
    correct_answer: string
    is_scenario?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { branch, category, question, context, answers, correct_answer, is_scenario = false } = body

  // Validations strictes
  if (!branch?.trim()) {
    return NextResponse.json({ error: 'La branche est obligatoire.' }, { status: 400 })
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: 'La catégorie est obligatoire.' }, { status: 400 })
  }
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Le texte de la question est obligatoire.' }, { status: 400 })
  }
  if (!answers || answers.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 réponses sont requises.' }, { status: 400 })
  }
  const filledAnswers = answers.map(a => a?.trim()).filter(Boolean)
  if (filledAnswers.length < 2) {
    return NextResponse.json({ error: 'Au moins 2 réponses non-vides sont requises.' }, { status: 400 })
  }
  if (!correct_answer?.trim()) {
    return NextResponse.json({ error: 'La bonne réponse est obligatoire.' }, { status: 400 })
  }
  if (!filledAnswers.includes(correct_answer.trim())) {
    return NextResponse.json({ error: 'La bonne réponse doit faire partie des réponses proposées.' }, { status: 400 })
  }
  if (is_scenario && !context?.trim()) {
    return NextResponse.json({ error: 'Le contexte est obligatoire pour un scénario.' }, { status: 400 })
  }

  const { data: question_row, error: qErr } = await supabaseAdmin
    .from('questions')
    .insert({
      branch:         branch.trim(),
      category:       category.trim(),
      question:       question.trim(),
      context:        is_scenario ? (context?.trim() ?? null) : null,
      answers:        filledAnswers,
      correct_answer: correct_answer.trim(),
      is_scenario,
    })
    .select('id')
    .single()

  if (qErr || !question_row) {
    return NextResponse.json({ error: qErr?.message ?? 'Erreur lors de la création.' }, { status: 500 })
  }

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'create_question',
    details: { question_id: question_row.id, branch, category, is_scenario },
  })

  return NextResponse.json({ question_id: question_row.id, message: 'Question créée.' }, { status: 201 })
}
