import type { GameType } from '@/types'

// XP per correct answer by game type
const BASE_XP: Record<GameType, number> = {
  quiz: 30,
  dungeon: 50,
  memory: 20,
  'speed-sort': 25,
  scenario: 40,
  detective: 45,
  'trivia-crack': 25,
  platformer: 30,
}

const DIFF_MULTIPLIER = { 1: 1, 2: 1.5, 3: 2.5 }

// Rank thresholds — bonus coins awarded on crossing these levels
export const RANK_THRESHOLDS: Record<number, { name: string; bonusCoins: number; bonusXP: number }> = {
  5:  { name: 'Initié',         bonusCoins: 200,  bonusXP: 300  },
  10: { name: 'Intermédiaire',  bonusCoins: 400,  bonusXP: 600  },
  15: { name: 'Avancé',         bonusCoins: 700,  bonusXP: 1000 },
  20: { name: 'Expert',         bonusCoins: 1200, bonusXP: 1800 },
  25: { name: 'Maître',         bonusCoins: 2000, bonusXP: 3000 },
  30: { name: 'Légendaire',     bonusCoins: 3500, bonusXP: 5000 },
}

export interface BonusBreakdown {
  base: number
  difficulty_mult: number
  accuracy_bonus: number       // 0 = none, 0.5 = +50%
  streak_bonus: number         // 0–0.5
  time_bonus: number           // 0–0.3
  level_bonus: number          // 0–0.3
  perfect: boolean
}

export function calcXP(
  gameType: GameType,
  correct: number,
  total: number,
  difficulty: 1 | 2 | 3 = 1,
  streak: number = 0,
  timeBonusPct: number = 0,
  characterLevel: number = 1,
): { xp: number; breakdown: BonusBreakdown } {
  const base = BASE_XP[gameType] ?? 30
  const diffMult = DIFF_MULTIPLIER[difficulty]
  const perfect = total > 0 && correct === total
  const accuracyBonus = perfect ? 0.5 : 0              // +50% for perfect
  const streakBonus = Math.min(streak * 0.05, 0.5)     // up to +50%
  const timeBonus = Math.min(timeBonusPct, 1) * 0.3    // up to +30%
  const levelBonus = Math.min((characterLevel - 1) * 0.01, 0.3) // +1%/level, max +30%

  const raw = base * correct * diffMult * (1 + accuracyBonus + streakBonus + timeBonus + levelBonus)
  const xp = Math.round(raw)

  return {
    xp,
    breakdown: {
      base: Math.round(base * correct * diffMult),
      difficulty_mult: diffMult,
      accuracy_bonus: accuracyBonus,
      streak_bonus: Math.round(streakBonus * 100) / 100,
      time_bonus: Math.round(timeBonus * 100) / 100,
      level_bonus: Math.round(levelBonus * 100) / 100,
      perfect,
    },
  }
}

export function calcCoins(xp: number, characterLevel: number = 1): number {
  const levelBonus = Math.min((characterLevel - 1) * 0.01, 0.3)
  return Math.round(xp * 0.40 * (1 + levelBonus))
}

export function calcLevelFromXP(totalXP: number): { level: number; xpToNext: number } {
  // XP needed per level: 500 * level^1.4
  let level = 1
  let accumulated = 0
  while (true) {
    const needed = Math.round(500 * Math.pow(level, 1.4))
    if (accumulated + needed > totalXP) {
      return { level, xpToNext: needed - (totalXP - accumulated) }
    }
    accumulated += needed
    level++
    if (level > 50) return { level: 50, xpToNext: 0 }
  }
}

export function getCharacterClass(level: number): string {
  if (level <= 5)  return 'Recrue'
  if (level <= 10) return 'Analyste'
  if (level <= 15) return 'Conseiller'
  if (level <= 25) return 'Expert'
  if (level <= 35) return 'Maître'
  return 'Légende'
}
