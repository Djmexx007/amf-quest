'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Flame, Sword } from 'lucide-react'
import { getLeague } from '@/lib/leagues'
import type { LeaderboardEntry } from '@/types'

const CLASS_ICONS: Record<string, string> = {
  Recrue: '🗡️',
  Analyste: '📊',
  Conseiller: '💼',
  Expert: '🔮',
  Maître: '⚜️',
  Légende: '👑',
}

const RANK_COLORS = ['#D4A843', '#C0C0C0', '#CD7F32']

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.leaderboard) setEntries(d.leaderboard)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">🏆</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Trophy size={28} className="text-[#D4A843]" />
        <div>
          <h1 className="font-cinzel text-3xl font-bold text-white">Classement</h1>
          <p className="text-gray-400 text-sm">Les meilleurs aventuriers de ta branche</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rpg-card p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400">Aucun classement disponible pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1
            const rankColor = RANK_COLORS[i] ?? '#6B7280'
            const isCurrentUser = entry.user_id === user?.id

            return (
              <div
                key={entry.user_id}
                className="rpg-card px-5 py-4 flex items-center gap-4 transition-all"
                style={isCurrentUser ? { borderColor: 'rgba(212,168,67,0.4)', background: 'rgba(212,168,67,0.04)' } : {}}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {rank <= 3 ? (
                    <span className="text-xl">{['🥇', '🥈', '🥉'][rank - 1]}</span>
                  ) : (
                    <span className="font-cinzel font-bold text-sm" style={{ color: rankColor }}>
                      #{rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${rankColor}20`, border: `2px solid ${rankColor}50`, color: rankColor }}
                >
                  {entry.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{entry.full_name}</p>
                    {entry.equipped_title && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                        style={{ background: 'rgba(212,168,67,0.12)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.25)' }}>
                        {entry.equipped_title}
                      </span>
                    )}
                    {isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: 'rgba(212,168,67,0.15)', color: '#D4A843' }}>
                        Toi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-gray-500 text-xs">
                      {CLASS_ICONS[entry.class_name] ?? '⚔️'} {entry.class_name} • {entry.name}
                    </p>
                    {(() => {
                      const league = getLeague(entry.xp)
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                          style={{ background: `${league.color}12`, color: league.color, border: `1px solid ${league.color}25` }}>
                          {league.icon} {league.name}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {entry.streak_days > 0 && (
                    <div className="flex items-center gap-1 text-orange-400">
                      <Flame size={14} />
                      <span className="text-xs font-semibold">{entry.streak_days}</span>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Sword size={12} className="text-gray-500" />
                      <span className="text-white text-sm font-bold">Niv. {entry.level}</span>
                    </div>
                    <p className="text-gray-600 text-xs">{entry.xp.toLocaleString()} XP</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
