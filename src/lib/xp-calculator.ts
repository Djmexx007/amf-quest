import type { GameType } from '@/types'

// XP per correct answer by game type and difficulty
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

export function calcXP(
  gameType: GameType,
  correct: number,
  total: number,
  difficulty: 1 | 2 | 3 = 1,
  streak: number = 0,
  timeBonusPct: number = 0   // 0–1 based on remaining time
): number {
  const base = BASE_XP[gameType] ?? 30
  const diffMult = DIFF_MULTIPLIER[difficulty]
  const accuracyBonus = total > 0 ? (correct / total) === 1 ? 1.5 : 1 : 1 // perfect score = +50%
  const streakBonus = Math.min(streak * 0.05, 0.5)                          // up to +50% streak
  const timeBonus = timeBonusPct * 0.3                                       // up to +30% time

  const raw = base * correct * diffMult * accuracyBonus * (1 + streakBonus + timeBonus)
  return Math.round(raw)
}

export function calcCoins(xp: number): number {
  return Math.round(xp * 0.3)
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
