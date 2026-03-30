import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

const MISSION_TEMPLATES = [
  {
    mission_type: 'complete_game',
    title: 'Aventurier du jour',
    description: 'Complète 1 partie de n\'importe quel mini-jeu.',
    target_value: 1,
    xp_reward: 100,
    coin_reward: 50,
  },
  {
    mission_type: 'complete_game',
    title: 'Triple menace',
    description: 'Complète 3 parties de mini-jeux.',
    target_value: 3,
    xp_reward: 250,
    coin_reward: 120,
  },
  {
    mission_type: 'correct_answers',
    title: 'Apprenti savant',
    description: 'Réponds correctement à 10 questions.',
    target_value: 10,
    xp_reward: 150,
    coin_reward: 75,
  },
  {
    mission_type: 'correct_answers',
    title: 'Maître des réponses',
    description: 'Réponds correctement à 25 questions.',
    target_value: 25,
    xp_reward: 300,
    coin_reward: 150,
  },
  {
    mission_type: 'complete_quiz',
    title: 'Éclaireur',
    description: 'Complète 1 partie de Quiz Éclair.',
    target_value: 1,
    xp_reward: 120,
    coin_reward: 60,
  },
  {
    mission_type: 'complete_quiz',
    title: 'Virtuose du quiz',
    description: 'Complète 2 parties de Quiz Éclair.',
    target_value: 2,
    xp_reward: 200,
    coin_reward: 100,
  },
  {
    mission_type: 'perfect_score',
    title: 'Perfection',
    description: 'Obtiens un score parfait dans une partie.',
    target_value: 1,
    xp_reward: 400,
    coin_reward: 200,
  },
]

// Pick 3 distinct missions by rotating based on day of year
function pickMissions(dayOfYear: number) {
  const templates = [...MISSION_TEMPLATES]
  // Deterministic shuffle based on day
  for (let i = templates.length - 1; i > 0; i--) {
    const j = (dayOfYear * 31 + i * 17) % (i + 1)
    ;[templates[i], templates[j]] = [templates[j], templates[i]]
  }
  // Pick 3 different mission_types
  const picked = []
  const usedTypes = new Set<string>()
  for (const t of templates) {
    if (!usedTypes.has(t.mission_type)) {
      picked.push(t)
      usedTypes.add(t.mission_type)
    }
    if (picked.length === 3) break
  }
  return picked
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Check if missions already exist for today
  const { data: existing } = await supabaseAdmin
    .from('daily_missions')
    .select('id')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .eq('mission_date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, generated: false })
  }

  // Calculate day of year for deterministic rotation
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)

  const missions = pickMissions(dayOfYear)

  const inserts = missions.map(m => ({
    user_id: payload.sub,
    branch_id: payload.branch_id!,
    mission_type: m.mission_type,
    title: m.title,
    description: m.description,
    target_value: m.target_value,
    current_value: 0,
    xp_reward: m.xp_reward,
    coin_reward: m.coin_reward,
    completed: false,
    mission_date: today,
  }))

  const { error } = await supabaseAdmin
    .from('daily_missions')
    .insert(inserts)

  if (error && error.code !== '23505') { // ignore unique constraint
    return NextResponse.json({ error: 'Erreur lors de la génération.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, generated: true })
}
