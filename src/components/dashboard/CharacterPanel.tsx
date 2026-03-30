'use client'

import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import type { Character, Branch } from '@/types'

interface Props {
  character: Character
  branch: Branch
}

const CLASS_ICONS: Record<string, string> = {
  Recrue: '🗡️', Analyste: '📊', Conseiller: '💼',
  Expert: '⭐', 'Maître': '🔥', 'Légende': '👑',
}

export default function CharacterPanel({ character, branch }: Props) {
  const xpNeededForLevel = Math.round(500 * Math.pow(character.level, 1.4))
  const xpInCurrentLevel = xpNeededForLevel - character.xp_to_next_level
  const xpPct = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100)))
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
            <div className="flex items-center gap-2">
              <Badge color={branch.color} size="sm">{character.class_name}</Badge>
              <Badge color={branch.color} size="sm">Niv. {character.level}</Badge>
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

        {/* XP Bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Expérience</span>
            <span style={{ color: branch.color }}>
              {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
            </span>
          </div>
          <ProgressBar value={xpInCurrentLevel} max={xpNeededForLevel} color={branch.color} height={10} />
          <p className="text-right text-xs text-gray-600 mt-1">{xpPct}% vers niveau {character.level + 1}</p>
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
