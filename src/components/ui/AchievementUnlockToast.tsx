'use client'

import { useEffect, useState } from 'react'

interface Achievement {
  slug: string
  title: string
  xp: number
  coins: number
}

interface Props {
  achievements: Achievement[]
  onDone: () => void
}

export default function AchievementUnlockToast({ achievements, onDone }: Props) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      if (current < achievements.length - 1) {
        setVisible(false)
        setTimeout(() => { setCurrent(c => c + 1); setVisible(true) }, 300)
      } else {
        setVisible(false)
        setTimeout(onDone, 300)
      }
    }, 3500)
    return () => clearTimeout(timer)
  }, [current, visible, achievements.length, onDone])

  const ach = achievements[current]
  if (!ach) return null

  return (
    <div
      className="fixed top-20 right-6 z-50 transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-12px)' }}
    >
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a1f35, #111628)',
          border: '1px solid rgba(212,168,67,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(212,168,67,0.1)',
          minWidth: '280px',
        }}>
        <div className="text-4xl animate-bounce">🏆</div>
        <div>
          <p className="text-[#D4A843] text-xs font-semibold uppercase tracking-widest mb-0.5">
            Succès débloqué !
          </p>
          <p className="text-white font-cinzel font-bold text-base leading-tight">{ach.title}</p>
          <div className="flex gap-3 mt-1.5 text-xs">
            {ach.xp > 0 && <span className="text-[#D4A843] font-semibold">+{ach.xp} XP</span>}
            {ach.coins > 0 && <span className="text-[#25C292] font-semibold">+{ach.coins} 💰</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
