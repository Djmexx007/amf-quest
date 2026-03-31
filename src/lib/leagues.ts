// ── League System ─────────────────────────────────────────────
// Leagues are based on total accumulated XP

export interface LeagueInfo {
  name: string
  icon: string
  color: string
  progress: number      // 0–100 within this league
  xpToNext: number      // XP needed to reach next league (0 if at top)
  nextLeague: string | null
}

const TIERS = [
  { name: 'Bronze',      icon: '🥉', color: '#CD7F32', min: 0,       max: 5_000    },
  { name: 'Argent',      icon: '🥈', color: '#A8A9AD', min: 5_000,   max: 15_000   },
  { name: 'Or',          icon: '🥇', color: '#D4A843', min: 15_000,  max: 35_000   },
  { name: 'Platine',     icon: '💎', color: '#4D8BFF', min: 35_000,  max: 75_000   },
  { name: 'Diamant',     icon: '💠', color: '#A78BFA', min: 75_000,  max: 150_000  },
  { name: 'Légendaire',  icon: '👑', color: '#FF9F0A', min: 150_000, max: Infinity },
]

export function getLeague(xp: number): LeagueInfo {
  let idx = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (xp >= TIERS[i].min) idx = i
    else break
  }
  const tier = TIERS[idx]
  const isLast = idx === TIERS.length - 1
  const xpInTier = xp - tier.min
  const tierRange = isLast ? 1 : tier.max - tier.min
  return {
    name: tier.name,
    icon: tier.icon,
    color: tier.color,
    progress: isLast ? 100 : Math.min(100, Math.round((xpInTier / tierRange) * 100)),
    xpToNext: isLast ? 0 : tier.max - xp,
    nextLeague: isLast ? null : TIERS[idx + 1].name,
  }
}

export const ALL_LEAGUES = TIERS
