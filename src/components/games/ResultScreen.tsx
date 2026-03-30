'use client'

import { useRouter } from 'next/navigation'

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
}

export default function ResultScreen({
  score, correct, total, xpEarned, coinsEarned,
  levelUp, newLevel, branchColor, onReplay, gameLabel,
}: Props) {
  const router = useRouter()
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const rank =
    accuracy === 100 ? { label: 'PARFAIT', icon: '👑', color: '#D4A843' } :
    accuracy >= 80   ? { label: 'EXCELLENT', icon: '⭐', color: branchColor } :
    accuracy >= 60   ? { label: 'BIEN', icon: '✓', color: '#25C292' } :
    accuracy >= 40   ? { label: 'PASSABLE', icon: '→', color: '#F59E0B' } :
                       { label: 'À AMÉLIORER', icon: '↺', color: '#FF4D6A' }

  return (
    <div className="max-w-md mx-auto text-center animate-slide-up">
      {levelUp && (
        <div
          className="mb-6 p-4 rounded-xl border font-cinzel font-bold text-lg animate-pulse-glow"
          style={{ borderColor: branchColor, background: `${branchColor}15`, color: branchColor }}
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
        <div
          className="text-6xl font-cinzel font-black mb-2"
          style={{ color: branchColor }}
        >
          {accuracy}%
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {correct} / {total} réponses correctes
        </p>

        <div className="grid grid-cols-3 gap-4">
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
