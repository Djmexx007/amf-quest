import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import type { GameType, QuestionType } from '@/types'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })

  const { searchParams } = request.nextUrl
  const gameType    = searchParams.get('game') as GameType | null
  const qType       = searchParams.get('type') as QuestionType | null
  const category    = searchParams.get('category')           // category_id
  const count       = Math.min(Number(searchParams.get('count') ?? '10'), 50)
  const difficulty  = searchParams.get('difficulty')
  // Comma-separated list of question IDs to exclude (already-seen deduplication)
  const excludeRaw  = searchParams.get('exclude')
  const exclude     = excludeRaw ? excludeRaw.split(',').filter(Boolean) : []

  let query = supabaseAdmin
    .from('questions')
    .select(`
      id,
      question_text,
      context_text,
      icon,
      difficulty,
      question_type,
      category_id,
      explanation,
      tip,
      answers(id, answer_text, is_correct, order_index, answer_metadata),
      question_categories(id, name, icon, color)
    `)
    .eq('branch_id', payload.branch_id)
    .eq('status', 'approved')

  if (gameType) {
    query = query.contains('game_types', [gameType])
  }
  if (qType) {
    query = query.eq('question_type', qType)
  }
  if (category) {
    query = query.eq('category_id', category)
  }
  if (difficulty) {
    query = query.eq('difficulty', Number(difficulty))
  }
  if (exclude.length > 0) {
    query = query.not('id', 'in', `(${exclude.join(',')})`)
  }

  const { data: questions, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Aucune question disponible pour cette branche.' }, { status: 404 })
  }

  // Shuffle and pick N
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, count)
  const withShuffledAnswers = shuffled.map((q) => ({
    ...q,
    answers: (q.answers as { id: string; answer_text: string; is_correct: boolean; order_index: number; answer_metadata: Record<string, unknown> | null }[])
      // For sorting questions, preserve correct order; shuffle all others
      .sort(q.question_type === 'sorting'
        ? (a, b) => Math.random() - 0.5  // randomize display order, client orders by answer_metadata.correct_position
        : () => Math.random() - 0.5
      ),
  }))

  return NextResponse.json({ questions: withShuffledAnswers })
}
