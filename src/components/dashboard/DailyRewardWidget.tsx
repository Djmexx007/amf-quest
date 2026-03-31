'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

const DAILY_REWARDS = [
  { day: 1, xp: 50,  coins: 30  },
  { day: 2, xp: 75,  coins: 45  },
  { day: 3, xp: 100, coins: 60  },
  { day: 4, xp: 125, coins: 75  },
  { day: 5, xp: 150, coins: 90  },
  { day: 6, xp: 175, coins: 100 },
  { day: 7, xp: 300, coins: 200 },
]

interface Props {
  loginStreak: number
  alreadyClaimed: boolean
  branchColor: string
  onClaim: (xp: number, coins: number, streak: number) => void
}

export default function DailyRewardWidget({ loginStreak, alreadyClaimed, branchColor, onClaim }: Props) {
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed]   = useState(alreadyClaimed)
  const [reward, setReward]     = useState<{ xp: number; coins: number } | null>(null)

  // Which day in the 7-day cycle are we on (1–7)
  const currentDay = ((loginStreak % 7) || 7)
  const nextDay    = (currentDay % 7) + 1
  const todayReward = DAILY_REWARDS[currentDay - 1]

  async function claim() {
    if (claiming || claimed) return
    setClaiming(true)
    try {
      const res  = await fetch('/api/user/claim-daily', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setReward({ xp: data.xp_earned, coins: data.coins_earned })
        setClaimed(true)
        onClaim(data.xp_earned, data.coins_earned, data.streak)
      } else if (data.already_claimed) {
        setClaimed(true)
      }
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="rpg-card p-5" style={{ borderColor: `${branchColor}20` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color: branchColor }} />
          <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Récompense du jour</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span>🔥</span>
          <span className="font-cinzel font-bold text-sm text-orange-400">{loginStreak}</span>
          <span className="text-gray-500 text-xs">jours</span>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAILY_REWARDS.map(({ day, xp }) => {
          const isPast   = day < currentDay
          const isToday  = day === currentDay
          const isFuture = day > currentDay

          return (
            <div key={day}
              className="flex flex-col items-center py-2 rounded-lg text-center"
              style={{
                background: isToday
                  ? `${branchColor}18`
                  : isPast ? 'rgba(37,194,146,0.06)' : 'rgba(255,255,255,0.02)',
                border: isToday
                  ? `1px solid ${branchColor}45`
                  : isPast ? '1px solid rgba(37,194,146,0.15)' : '1px solid rgba(255,255,255,0.05)',
              }}>
              <span className="text-[9px] text-gray-500 mb-1">J{day}</span>
              {isPast   && <span className="text-green-400 text-xs leading-none">✓</span>}
              {isToday  && <span className="text-sm leading-none">{claimed ? '✓' : '🎁'}</span>}
              {isFuture && <span className="text-gray-700 text-xs leading-none">🔒</span>}
              <span className="text-[9px] mt-1 leading-none font-semibold"
                style={{ color: isToday ? branchColor : isPast ? '#25C292' : '#374151' }}>
                {isToday ? day === 7 ? '🏆' : `+${xp}` : day === 7 ? '🏆' : `+${xp}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      {reward ? (
        <div className="text-center p-3 rounded-xl animate-slide-up"
          style={{ background: `${branchColor}10`, border: `1px solid ${branchColor}25` }}>
          <p className="text-white text-sm font-semibold">🎉 Récompense réclamée !</p>
          <p className="text-sm mt-0.5" style={{ color: branchColor }}>
            +{reward.xp} XP · +{reward.coins} 🪙
          </p>
        </div>
      ) : claimed ? (
        <div className="text-center p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-gray-500 text-sm">✓ Déjà réclamée aujourd'hui</p>
          <p className="text-gray-600 text-xs mt-0.5">
            Demain : +{DAILY_REWARDS[nextDay - 1].xp} XP · +{DAILY_REWARDS[nextDay - 1].coins} 🪙
          </p>
        </div>
      ) : (
        <button onClick={claim} disabled={claiming}
          className="w-full py-2.5 rounded-xl font-cinzel font-bold text-sm transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`,
            color: '#080A12',
            boxShadow: `0 0 20px ${branchColor}30`,
          }}>
          {claiming
            ? 'Réclamation...'
            : currentDay === 7
              ? `🏆 Réclamer Semaine complète ! (+${todayReward.xp} XP)`
              : `🎁 Réclamer +${todayReward.xp} XP +${todayReward.coins} 🪙`}
        </button>
      )}
    </div>
  )
}
