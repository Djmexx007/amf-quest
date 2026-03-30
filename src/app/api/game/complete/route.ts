import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcXP, calcCoins, calcLevelFromXP, getCharacterClass, RANK_THRESHOLDS } from '@/lib/xp-calculator'
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

  // Fetch global game config multipliers
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

  // Fetch character (need level for scaling)
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('xp, level, coins, total_games_played, total_questions_answered, total_correct_answers, streak_days, last_activity_date')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  const { xp: rawXP, breakdown } = calcXP(
    game_type, questions_correct, questions_total,
    difficulty, best_streak, time_bonus_pct, character.level,
  )
  const xp_earned = Math.round(rawXP * xpMultiplier)
  const coins_earned = Math.round(calcCoins(xp_earned, character.level) * goldMultiplier)

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

  const newTotalXP = character.xp + xp_earned
  const { level: newLevel, xpToNext } = calcLevelFromXP(newTotalXP)
  const newClass = getCharacterClass(newLevel)
  const levelUp = newLevel > character.level

  // Detect rank threshold crossing
  let rankUpReward: { name: string; bonusCoins: number; bonusXP: number } | null = null
  if (levelUp) {
    for (let lvl = character.level + 1; lvl <= newLevel; lvl++) {
      if (RANK_THRESHOLDS[lvl]) {
        rankUpReward = RANK_THRESHOLDS[lvl]
        break
      }
    }
  }

  // Streak logic
  const today = new Date().toISOString().split('T')[0]
  const lastActivity = character.last_activity_date
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const newStreak = lastActivity === today
    ? character.streak_days
    : lastActivity === yesterday
    ? character.streak_days + 1
    : 1

  const totalXPGain = xp_earned + (rankUpReward?.bonusXP ?? 0)
  const totalCoinsGain = coins_earned + (rankUpReward?.bonusCoins ?? 0)

  await supabaseAdmin
    .from('characters')
    .update({
      xp: character.xp + totalXPGain,
      level: newLevel,
      xp_to_next_level: xpToNext,
      class_name: newClass,
      coins: character.coins + totalCoinsGain,
      total_games_played: character.total_games_played + 1,
      total_questions_answered: character.total_questions_answered + questions_total,
      total_correct_answers: character.total_correct_answers + questions_correct,
      streak_days: newStreak,
      last_activity_date: today,
    })
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)

  // Notify on rank-up milestone
  if (rankUpReward) {
    void supabaseAdmin.from('notifications').insert({
      user_id: payload.sub,
      type: 'rank_up',
      title: `🏆 Nouveau rang: ${rankUpReward.name}!`,
      message: `Tu as atteint le niveau ${newLevel} et obtenu +${rankUpReward.bonusXP} XP et +${rankUpReward.bonusCoins} coins en récompense!`,
      is_read: false,
    })
  }

  // Update daily missions
  await updateMissions(payload.sub, payload.branch_id, game_type, questions_correct, score, breakdown.perfect)

  // Check achievements
  const newAchievements = await checkAndUnlockAchievements({
    userId: payload.sub,
    branchId: payload.branch_id,
    level: newLevel,
    xp: character.xp + totalXPGain,
    streak_days: newStreak,
    total_games_played: character.total_games_played + 1,
    total_correct_answers: character.total_correct_answers + questions_correct,
    coins: character.coins + totalCoinsGain,
  }).catch(() => [])

  return NextResponse.json({
    xp_earned,
    coins_earned,
    level_up: levelUp,
    new_level: newLevel,
    new_class: newClass,
    total_xp: character.xp + totalXPGain,
    session_id: session?.id,
    achievements_unlocked: newAchievements,
    bonus_breakdown: breakdown,
    rank_up_reward: rankUpReward,
  })
}

async function updateMissions(
  userId: string, branchId: string,
  gameType: string, correct: number, score: number, perfect: boolean,
) {
  const today = new Date().toISOString().split('T')[0]

  // Get today's daily missions + this week's weekly mission
  const weekStart = getWeekStart()
  const { data: missions } = await supabaseAdmin
    .from('daily_missions')
    .select('*')
    .eq('user_id', userId)
    .eq('branch_id', branchId)
    .in('mission_date', [today, weekStart])
    .eq('completed', false)

  if (!missions) return

  for (const mission of missions) {
    let increment = 0
    if (mission.mission_type === 'complete_quiz' && gameType === 'quiz') increment = 1
    if (mission.mission_type === 'complete_game') increment = 1
    if (mission.mission_type === 'complete_dungeon' && gameType === 'dungeon') increment = 1
    if (mission.mission_type === 'complete_memory' && gameType === 'memory') increment = 1
    if (mission.mission_type === 'complete_detective' && gameType === 'detective') increment = 1
    if (mission.mission_type === 'correct_answers') increment = correct
    if (mission.mission_type === 'perfect_score' && perfect) increment = 1
    if (mission.mission_type === 'high_score' && score >= (mission.target_value)) increment = 1
    // Weekly
    if (mission.mission_type === 'weekly_games') increment = 1
    if (mission.mission_type === 'weekly_correct') increment = correct
    if (mission.mission_type === 'weekly_perfect' && perfect) increment = 1

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
      void supabaseAdmin.rpc('increment_character_rewards', {
        p_user_id: userId,
        p_branch_id: branchId,
        p_xp: mission.xp_reward,
        p_coins: mission.coin_reward,
      })
      // Notify mission complete
      void supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'mission_complete',
        title: `✅ Mission accomplie: ${mission.title}`,
        message: `+${mission.xp_reward} XP et +${mission.coin_reward} coins réclamés!`,
        is_read: false,
      })
    }
  }
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}
