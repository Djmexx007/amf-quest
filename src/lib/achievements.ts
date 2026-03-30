import { supabaseAdmin } from '@/lib/supabase/server'

interface CharacterStats {
  userId: string
  branchId: string
  level: number
  xp: number
  streak_days: number
  total_games_played: number
  total_correct_answers: number
  coins: number
}

interface SessionInfo {
  game_type: string
  score: number
  questions_correct: number
  difficulty?: string
}

// Map condition_type → how to check it
type ConditionChecker = (value: number, stats: CharacterStats, sessionStats: SessionStats) => boolean

interface SessionStats {
  quizGames: number
  dungeonGames: number
  memoryGames: number
  speedGames: number
  uniqueGames: Set<string>
  dungeonPerfect: boolean
  memory6x6: boolean
  shopPurchases: number
  perfectScores: number
  totalCoinsEarned: number
}

async function getSessionStats(userId: string): Promise<SessionStats> {
  const [quizRes, dungeonRes, memoryRes, speedRes, allRes, shopRes] = await Promise.all([
    supabaseAdmin.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('game_type', 'quiz').eq('completed', true),
    supabaseAdmin.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('game_type', 'dungeon').eq('completed', true),
    supabaseAdmin.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('game_type', 'memory').eq('completed', true),
    supabaseAdmin.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('game_type', 'speed-sort').eq('completed', true),
    supabaseAdmin.from('game_sessions').select('game_type, score, metadata').eq('user_id', userId).eq('completed', true),
    supabaseAdmin.from('user_inventory').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const allSessions = allRes.data ?? []
  const uniqueGames = new Set(allSessions.map(s => s.game_type))
  const perfectScores = allSessions.filter(s => s.score >= 100).length
  const dungeonPerfect = allSessions.some(s => s.game_type === 'dungeon' && (s.metadata as Record<string, unknown>)?.no_damage === true)
  const memory6x6 = allSessions.some(s => s.game_type === 'memory' && (s.metadata as Record<string, unknown>)?.grid === '6x6')

  // Get total coins earned from sessions
  const { data: coinsData } = await supabaseAdmin
    .from('game_sessions')
    .select('coins_earned')
    .eq('user_id', userId)

  const totalCoinsEarned = (coinsData ?? []).reduce((sum, s) => sum + (s.coins_earned ?? 0), 0)

  return {
    quizGames: quizRes.count ?? 0,
    dungeonGames: dungeonRes.count ?? 0,
    memoryGames: memoryRes.count ?? 0,
    speedGames: speedRes.count ?? 0,
    uniqueGames,
    dungeonPerfect,
    memory6x6,
    shopPurchases: shopRes.count ?? 0,
    perfectScores,
    totalCoinsEarned,
  }
}

// Check a single achievement condition
function checkCondition(condType: string, condValue: number, stats: CharacterStats, ss: SessionStats): boolean {
  switch (condType) {
    case 'games_played':        return stats.total_games_played >= condValue
    case 'perfect_score':       return ss.perfectScores >= condValue
    case 'streak_days':         return stats.streak_days >= condValue
    case 'quiz_games':          return ss.quizGames >= condValue
    case 'dungeon_games':       return ss.dungeonGames >= condValue
    case 'memory_games':        return ss.memoryGames >= condValue
    case 'speed_games':         return ss.speedGames >= condValue
    case 'total_correct':       return stats.total_correct_answers >= condValue
    case 'total_xp':            return stats.xp >= condValue
    case 'level':               return stats.level >= condValue
    case 'dungeon_perfect':     return ss.dungeonPerfect
    case 'memory_6x6':          return ss.memory6x6
    case 'unique_games':        return ss.uniqueGames.size >= condValue
    case 'shop_purchases':      return ss.shopPurchases >= condValue
    case 'total_coins_earned':  return ss.totalCoinsEarned >= condValue
    default:                    return false
  }
}

export async function checkAndUnlockAchievements(stats: CharacterStats): Promise<{ slug: string; title: string; xp: number; coins: number }[]> {
  // Fetch all achievements
  const { data: allAchievements } = await supabaseAdmin
    .from('achievements')
    .select('id, slug, title, condition_type, condition_value, xp_reward, coin_reward, rarity')

  if (!allAchievements || allAchievements.length === 0) return []

  // Fetch already unlocked
  const { data: unlocked } = await supabaseAdmin
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', stats.userId)

  const unlockedSet = new Set((unlocked ?? []).map(u => u.achievement_id))

  // Get session stats for complex conditions
  const ss = await getSessionStats(stats.userId)

  const newlyUnlocked: { slug: string; title: string; xp: number; coins: number }[] = []

  for (const ach of allAchievements) {
    if (unlockedSet.has(ach.id)) continue
    if (!checkCondition(ach.condition_type, ach.condition_value, stats, ss)) continue

    // Unlock it
    await supabaseAdmin.from('user_achievements').insert({
      user_id: stats.userId,
      branch_id: stats.branchId,
      achievement_id: ach.id,
    })

    // Award XP + coins
    if (ach.xp_reward > 0 || ach.coin_reward > 0) {
      void supabaseAdmin.rpc('increment_character_rewards', {
        p_user_id: stats.userId,
        p_branch_id: stats.branchId,
        p_xp: ach.xp_reward,
        p_coins: ach.coin_reward,
      })
    }

    // Notify
    await supabaseAdmin.from('notifications').insert({
      user_id: stats.userId,
      title: '🏆 Succès débloqué !',
      message: `"${ach.title}" — +${ach.xp_reward} XP, +${ach.coin_reward} coins`,
      type: 'success',
    })

    newlyUnlocked.push({ slug: ach.slug, title: ach.title, xp: ach.xp_reward, coins: ach.coin_reward })
  }

  return newlyUnlocked
}
