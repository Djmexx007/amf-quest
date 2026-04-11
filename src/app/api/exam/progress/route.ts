import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 401 })

  let body: {
    module_id: string
    score_pct: number
    questions_total: number
    correct_answers: number
    time_spent_seconds: number
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { module_id, score_pct, questions_total, correct_answers, time_spent_seconds } = body
  if (!module_id) return NextResponse.json({ error: 'module_id requis.' }, { status: 400 })

  // Read current progress to do proper max()
  const { data: existing } = await supabaseAdmin
    .from('user_module_progress')
    .select('best_score, questions_answered, correct_answers, time_spent_seconds')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .eq('module_id', module_id)
    .maybeSingle()

  const newBest   = Math.max(existing?.best_score ?? 0, Math.round(score_pct))
  const totalQ    = (existing?.questions_answered ?? 0) + questions_total
  const totalCorr = (existing?.correct_answers ?? 0) + correct_answers
  const totalTime = (existing?.time_spent_seconds ?? 0) + time_spent_seconds

  const { error } = await supabaseAdmin
    .from('user_module_progress')
    .upsert({
      user_id: payload.sub,
      branch_id: payload.branch_id,
      module_id,
      best_score: newBest,
      completion_pct: newBest,
      questions_answered: totalQ,
      correct_answers: totalCorr,
      time_spent_seconds: totalTime,
      last_activity_at: new Date().toISOString(),
    }, { onConflict: 'user_id,branch_id,module_id' })

  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })
  return NextResponse.json({ ok: true, best_score: newBest })
}
