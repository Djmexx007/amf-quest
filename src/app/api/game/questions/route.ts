import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

/**
 * GET /api/game/questions
 *
 * Params:
 *   count     — nombre de questions (défaut 10, max 50)
 *   scenario  — 'true' pour mode scénario, 'false' (défaut) pour mini-jeux normaux
 *   category  — nom de catégorie (Arène du Savoir uniquement)
 *
 * La difficulté est gérée exclusivement par le gameplay (vitesse, vies, etc.),
 * jamais par les questions elles-mêmes.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })
  }

  // Résoudre le slug de branche depuis le branch_id JWT
  const { data: branchData } = await supabaseAdmin
    .from('branches')
    .select('slug')
    .eq('id', payload.branch_id)
    .single()

  if (!branchData) {
    return NextResponse.json({ error: 'Branche introuvable.' }, { status: 400 })
  }

  const { searchParams } = request.nextUrl
  const count      = Math.min(Number(searchParams.get('count') ?? '10'), 50)
  const isScenario = searchParams.get('scenario') === 'true'
  const category   = searchParams.get('category') ?? null

  // Fetch 3× le nombre demandé pour avoir de la marge après mélange
  let query = supabaseAdmin
    .from('questions')
    .select('id, question, context, answers, correct_answer, branch, category, is_scenario')
    .eq('branch', branchData.slug)
    .eq('is_scenario', isScenario)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(Math.min(count * 3, 150))

  if (category) {
    query = query.eq('category', category)
  }

  const { data: questions, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Aucune question disponible pour cette branche.' }, { status: 404 })
  }

  // Mélanger et prendre N questions
  const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, count)

  // Anti-répétition: marquer les questions comme utilisées (fire and forget)
  const ids = shuffled.map(q => q.id)
  void supabaseAdmin.rpc('mark_questions_used', { question_ids: ids })

  // Mélanger les réponses à l'intérieur de chaque question
  const result = shuffled.map(q => ({
    ...q,
    answers: [...(q.answers as string[])].sort(() => Math.random() - 0.5),
  }))

  return NextResponse.json({ questions: result })
}
