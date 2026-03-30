import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcXP, calcCoins, calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import type { GameType } from '@/types'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })

  let body: {
    game_type: GameType
    score: number
    questions_total: number
    questions_correct: number
    best_streak: number
    avg_time_seconds: number
    difficulty?: 1 | 2 | 3
    time_bonus_pct?: number
    metadata?: Record<string, unknown>
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const {
    game_type, score, questions_total, questions_correct,
    best_streak = 0, avg_time_seconds = 0, difficulty = 1, time_bonus_pct = 0, metadata = {},
  } = body

  // Fetch global game config multipliers (non-blocking, default to 1 on failure)
  let xpMultiplier = 1.0
  let goldMultiplier = 1.0
  const { data: config } = await supabaseAdmin
    .from('game_config')
    .select('xp_multiplier, gold_multiplier')
    .limit(1)
    .maybeSingle()
  if (config) {
    xpMultiplier = config.xp_multiplier ?? 1.0
    goldMultiplier = config.gold_multiplier ?? 1.0
  }

  const xp_earned = Math.round(calcXP(game_type, questions_correct, questions_total, difficulty, best_streak, time_bonus_pct) * xpMultiplier)
  const coins_earned = Math.round(calcCoins(xp_earned) * goldMultiplier)

  // Save session
  const { data: session } = await supabaseAdmin
    .from('game_sessions')
    .insert({
      user_id: payload.sub,
      branch_id: payload.branch_id,
      game_type,
      difficulty: String(difficulty),
      score,
      xp_earned,
      coins_earned,
      questions_total,
      questions_correct,
      best_streak,
      avg_time_seconds,
      completed: true,
      completed_at: new Date().toISOString(),
      metadata,
    })
    .select('id')
    .single()

  // Update character
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('xp, level, coins, total_games_played, total_questions_answered, total_correct_answers, streak_days, last_activity_date')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  const newTotalXP = character.xp + xp_earned
  const { level: newLevel, xpToNext } = calcLevelFromXP(newTotalXP)
  const newClass = getCharacterClass(newLevel)
  const levelUp = newLevel > character.level

  // Streak logic
  const today = new Date().toISOString().split('T')[0]
  const lastActivity = character.last_activity_date
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const newStreak = lastActivity === today
    ? character.streak_days
    : lastActivity === yesterday
    ? character.streak_days + 1
    : 1

  await supabaseAdmin
    .from('characters')
    .update({
      xp: newTotalXP,
      level: newLevel,
      xp_to_next_level: xpToNext,
      class_name: newClass,
      coins: character.coins + coins_earned,
      total_games_played: character.total_games_played + 1,
      total_questions_answered: character.total_questions_answered + questions_total,
      total_correct_answers: character.total_correct_answers + questions_correct,
      streak_days: newStreak,
      last_activity_date: today,
    })
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)

  // Update daily missions
  await updateMissions(payload.sub, payload.branch_id, game_type, questions_correct, score)

  // Check and unlock achievements (fire-and-forget style but we await to get newly unlocked)
  const newAchievements = await checkAndUnlockAchievements({
    userId: payload.sub,
    branchId: payload.branch_id,
    level: newLevel,
    xp: newTotalXP,
    streak_days: newStreak,
    total_games_played: character.total_games_played + 1,
    total_correct_answers: character.total_correct_answers + questions_correct,
    coins: character.coins + coins_earned,
  }).catch(() => [])

  return NextResponse.json({
    xp_earned,
    coins_earned,
    level_up: levelUp,
    new_level: newLevel,
    new_class: newClass,
    total_xp: newTotalXP,
    session_id: session?.id,
    achievements_unlocked: newAchievements,
  })
}

async function updateMissions(userId: string, branchId: string, gameType: string, correct: number, score: number) {
  const today = new Date().toISOString().split('T')[0]
  const { data: missions } = await supabaseAdmin
    .from('daily_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .eq('mission_date', today)
    .eq('completed', false)

  if (!missions) return

  for (const mission of missions) {
    let increment = 0
    if (mission.mission_type === 'complete_quiz' && gameType === 'quiz') increment = 1
    if (mission.mission_type === 'complete_game') increment = 1
    if (mission.mission_type === 'correct_answers') increment = correct
    if (mission.mission_type === 'perfect_score' && correct > 0 && score === 100) increment = 1

    if (increment === 0) continue

    const newValue = Math.min(mission.current_value + increment, mission.target_value)
    const completed = newValue >= mission.target_value

    await supabaseAdmin
      .from('daily_missions')
      .update({
        current_value: newValue,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', mission.id)

    if (completed) {
      // Fire-and-forget — non-critical if RPC doesn't exist yet
      void supabaseAdmin.rpc('increment_character_rewards', {
        p_user_id: userId,
        p_branch_id: branchId,
        p_xp: mission.xp_reward,
        p_coins: mission.coin_reward,
      })
    }
  }
}
