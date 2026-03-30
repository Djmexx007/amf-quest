import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import type { GameType } from '@/types'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })

  const { searchParams } = request.nextUrl
  const gameType = searchParams.get('game') as GameType | null
  const count = Math.min(Number(searchParams.get('count') ?? '10'), 30)
  const difficulty = searchParams.get('difficulty')

  let query = supabaseAdmin
    .from('questions')
    .select('id, question_text, context_text, icon, difficulty, explanation, tip, answers(*)')
    .eq('branch_id', payload.branch_id)
    .eq('is_active', true)

  if (gameType) {
    query = query.contains('game_types', [gameType])
  }
  if (difficulty) {
    query = query.eq('difficulty', Number(difficulty))
  }

  const { data: questions, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Aucune question disponible pour cette branche.' }, { status: 404 })
  }

  // Shuffle and pick N
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, count)
  // Shuffle answers within each question
  const withShuffledAnswers = shuffled.map((q) => ({
    ...q,
    answers: (q.answers as {id:string;answer_text:string;is_correct:boolean;order_index:number}[]).sort(() => Math.random() - 0.5),
  }))

  return NextResponse.json({ questions: withShuffledAnswers })
}
