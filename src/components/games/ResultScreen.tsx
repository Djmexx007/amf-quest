'use client'

import { useRouter } from 'next/navigation'
import type { BonusBreakdown } from '@/lib/xp-calculator'

interface Props {
  score: number
  correct: number
  total: number
  xpEarned: number
  coinsEarned: number
  levelUp?: boolean
  newLevel?: number
  branchColor: string
  onReplay: () => void
  gameLabel: string
  bonusBreakdown?: BonusBreakdown
  rankUpReward?: { name: string; bonusCoins: number; bonusXP: number } | null
}

export default function ResultScreen({
  score, correct, total, xpEarned, coinsEarned,
  levelUp, newLevel, branchColor, onReplay, gameLabel,
  bonusBreakdown, rankUpReward,
}: Props) {
  const router = useRouter()
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const rank =
    accuracy === 100 ? { label: 'PARFAIT', icon: '👑', color: '#D4A843' } :
    accuracy >= 80   ? { label: 'EXCELLENT', icon: '⭐', color: branchColor } :
    accuracy >= 60   ? { label: 'BIEN', icon: '✓', color: '#25C292' } :
    accuracy >= 40   ? { label: 'PASSABLE', icon: '→', color: '#F59E0B' } :
                       { label: 'À AMÉLIORER', icon: '↺', color: '#FF4D6A' }

  const bonuses = bonusBreakdown ? [
    bonusBreakdown.perfect && { label: 'Score parfait', value: '+50%', color: '#D4A843', icon: '👑' },
    bonusBreakdown.streak_bonus > 0 && { label: `Série (×${Math.round(bonusBreakdown.streak_bonus / 0.05)})`, value: `+${Math.round(bonusBreakdown.streak_bonus * 100)}%`, color: '#F59E0B', icon: '🔥' },
    bonusBreakdown.time_bonus > 0 && { label: 'Vitesse', value: `+${Math.round(bonusBreakdown.time_bonus * 100)}%`, color: '#4D8BFF', icon: '⚡' },
    bonusBreakdown.level_bonus > 0 && { label: 'Bonus niveau', value: `+${Math.round(bonusBreakdown.level_bonus * 100)}%`, color: '#A78BFA', icon: '⬆️' },
  ].filter(Boolean) as { label: string; value: string; color: string; icon: string }[] : []

  return (
    <div className="max-w-md mx-auto text-center animate-slide-up">
      {/* Rank-up milestone */}
      {rankUpReward && (
        <div
          className="mb-4 p-4 rounded-xl border font-cinzel font-bold text-base animate-pulse-glow"
          style={{ borderColor: '#D4A843', background: 'rgba(212,168,67,0.1)', color: '#D4A843' }}
        >
          🏆 NOUVEAU RANG: {rankUpReward.name.toUpperCase()}!
          <p className="text-sm font-normal mt-1" style={{ color: '#B8892A' }}>
            Bonus: +{rankUpReward.bonusXP} XP · +{rankUpReward.bonusCoins} 🪙
          </p>
        </div>
      )}

      {/* Level up */}
      {levelUp && !rankUpReward && (
        <div
          className="mb-4 p-4 rounded-xl border font-cinzel font-bold text-lg animate-pulse-glow"
          style={{ borderColor: branchColor, background: `${branchColor}15`, color: branchColor }}
        >
          🎉 NIVEAU {newLevel} ATTEINT !
        </div>
      )}
      {levelUp && rankUpReward && (
        <div
          className="mb-4 p-3 rounded-xl font-cinzel font-bold text-sm"
          style={{ background: `${branchColor}10`, color: branchColor }}
        >
          🎉 NIVEAU {newLevel} ATTEINT !
        </div>
      )}

      {/* Rank badge */}
      <div
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-cinzel font-bold text-xl mb-6"
        style={{ background: `${rank.color}15`, border: `2px solid ${rank.color}50`, color: rank.color }}
      >
        <span>{rank.icon}</span>
        <span>{rank.label}</span>
      </div>

      {/* Score */}
      <div className="rpg-card p-8 mb-4">
        <div className="text-6xl font-cinzel font-black mb-2" style={{ color: branchColor }}>
          {accuracy}%
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {correct} / {total} réponses correctes
        </p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-bold text-white font-cinzel">{score}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">Score</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold font-cinzel" style={{ color: branchColor }}>+{xpEarned}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">XP</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-[#D4A843] font-cinzel">+{coinsEarned}</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">🪙 Coins</p>
          </div>
        </div>

        {/* Bonus breakdown */}
        {bonuses.length > 0 && (
          <div className="border-t border-white/5 pt-4 space-y-1.5">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">Bonus appliqués</p>
            {bonuses.map(b => (
              <div key={b.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <span>{b.icon}</span> {b.label}
                </span>
                <span className="font-semibold" style={{ color: b.color }}>{b.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReplay}
          className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase transition-all"
          style={{
            background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`,
            color: '#080A12',
            boxShadow: `0 0 20px ${branchColor}30`,
          }}
        >
          Rejouer {gameLabel}
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all"
        >
          Dashboard
        </button>
      </div>
    </div>
  )
}
