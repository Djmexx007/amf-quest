'use client'

import type { Branch } from '@/types'
import { Crown } from 'lucide-react'

interface LeaderboardEntry {
  user_id: string
  name: string
  level: number
  class_name: string
  xp: number
  streak_days: number
  full_name: string
}

interface Props {
  entries: LeaderboardEntry[]
  branch: Branch
  currentUserId?: string
}

const RANK_STYLES = [
  { icon: '🥇', color: '#D4A843' },
  { icon: '🥈', color: '#94A3B8' },
  { icon: '🥉', color: '#CD7F32' },
]

export default function Leaderboard({ entries, branch, currentUserId }: Props) {
  return (
    <div className="rpg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Crown size={16} style={{ color: branch.color }} />
        <h3 className="font-cinzel font-bold text-white tracking-wide">Classement</h3>
        <span className="text-xs text-gray-500 ml-auto">{branch.name}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Aucun joueur pour l'instant.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const isMe = entry.user_id === currentUserId
            const rank = RANK_STYLES[idx]

            return (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-all"
                style={{
                  background: isMe
                    ? `${branch.color}12`
                    : idx === 0
                    ? 'rgba(212,168,67,0.05)'
                    : 'transparent',
                  border: isMe ? `1px solid ${branch.color}30` : '1px solid transparent',
                }}
              >
                {/* Rank */}
                <div className="w-7 text-center flex-shrink-0">
                  {rank ? (
                    <span className="text-base">{rank.icon}</span>
                  ) : (
                    <span className="text-sm text-gray-500 font-mono">#{idx + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: `${branch.color}20`,
                    color: branch.color,
                  }}
                >
                  {entry.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {entry.full_name}
                    {isMe && <span className="text-xs text-gray-500 ml-1">(toi)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    Niv. {entry.level} · {entry.class_name}
                  </p>
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold" style={{ color: branch.color }}>
                    {entry.xp.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">XP</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
