'use client'

import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import { getLeague } from '@/lib/leagues'
import type { Character, Branch } from '@/types'

interface Props {
  character: Character
  branch: Branch
}

const CLASS_ICONS: Record<string, string> = {
  Recrue: '🗡️', Analyste: '📊', Conseiller: '💼',
  Expert: '⭐', 'Maître': '🔥', 'Légende': '👑',
}

function getRank(level: number): { rank: string; color: string; start: number; next: number } {
  if (level < 5)  return { rank: 'Novice',       color: '#9CA3AF', start: 1,  next: 5  }
  if (level < 10) return { rank: 'Initié',        color: '#25C292', start: 5,  next: 10 }
  if (level < 15) return { rank: 'Intermédiaire', color: '#4D8BFF', start: 10, next: 15 }
  if (level < 20) return { rank: 'Avancé',        color: '#F59E0B', start: 15, next: 20 }
  if (level < 30) return { rank: 'Expert',        color: '#A78BFA', start: 20, next: 30 }
  if (level < 40) return { rank: 'Maître',        color: '#FF4D6A', start: 30, next: 40 }
  return           { rank: 'Légendaire',           color: '#D4A843', start: 40, next: 50 }
}

export default function CharacterPanel({ character, branch }: Props) {
  const rank   = getRank(character.level)
  const league = getLeague(character.xp)

  // XP within current level
  const xpNeededForLevel = Math.round(500 * Math.pow(character.level, 1.4))
  const xpInCurrentLevel = xpNeededForLevel - character.xp_to_next_level
  const xpPct = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100)))

  // Progress within current rank tier
  const rankSpan = rank.next - rank.start
  const rankProgress = Math.min(100, Math.round(((character.level - rank.start) / rankSpan) * 100))

  const accuracy = character.total_questions_answered > 0
    ? Math.round((character.total_correct_answers / character.total_questions_answered) * 100)
    : 0

  return (
    <div
      className="rpg-card p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #111628 0%, ${branch.color}08 100%)`,
        borderColor: `${branch.color}25`,
      }}
    >
      {/* Branch glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: branch.color }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{CLASS_ICONS[character.class_name] ?? '🗡️'}</span>
              <h2 className="font-cinzel text-lg font-bold text-white">{character.name}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={branch.color} size="sm">{character.class_name}</Badge>
              <Badge color={branch.color} size="sm">Niv. {character.level}</Badge>
              <Badge color={rank.color} size="sm">{rank.rank}</Badge>
              <Badge color={league.color} size="sm">{league.icon} {league.name}</Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Branche</p>
            <p className="text-sm font-semibold mt-0.5 flex items-center gap-1.5 justify-end">
              <span>{branch.icon}</span>
              <span style={{ color: branch.color }}>{branch.exam_provider}</span>
            </p>
          </div>
        </div>

        {/* XP — niveau */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Progression niveau</span>
            <span style={{ color: branch.color }}>
              {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
            </span>
          </div>
          <ProgressBar value={xpInCurrentLevel} max={xpNeededForLevel} color={branch.color} height={10} />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{xpPct}% vers niveau {character.level + 1}</span>
            <span>{character.xp.toLocaleString()} XP accumulés</span>
          </div>
        </div>

        {/* Rang — progression vers rang suivant */}
        {rank.rank !== 'Légendaire' && (
          <div className="mb-3 p-3 rounded-lg" style={{ background: `${rank.color}08`, border: `1px solid ${rank.color}18` }}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: rank.color }}>{rank.rank}</span>
              <span className="text-gray-500">→ Nv.{rank.next} prochain rang</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${rankProgress}%`, background: rank.color }} />
            </div>
          </div>
        )}

        {/* Ligue — progression vers ligue suivante */}
        <div className="mb-5 p-3 rounded-lg" style={{ background: `${league.color}08`, border: `1px solid ${league.color}18` }}>
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: league.color }}>{league.icon} Ligue {league.name}</span>
            {league.nextLeague
              ? <span className="text-gray-500">→ {league.xpToNext.toLocaleString()} XP pour {league.nextLeague}</span>
              : <span style={{ color: league.color }}>Rang maximum ✨</span>}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${league.progress}%`, background: `linear-gradient(90deg, ${league.color}, ${league.color}99)` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Coins" value={`${character.coins.toLocaleString()} 🪙`} color={branch.color} />
          <StatBox label="Streak" value={`${character.streak_days} 🔥`} color={branch.color} />
          <StatBox label="Parties" value={String(character.total_games_played)} color={branch.color} />
          <StatBox label="Précision" value={`${accuracy}%`} color={branch.color} />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: `${color}08`, border: `1px solid ${color}15` }}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold mt-1 text-white">{value}</p>
    </div>
  )
}
