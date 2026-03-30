'use client'

import { useState, useEffect } from 'react'
import type { Branch } from '@/types'

interface Props {
  fullName: string
  branch: Branch
  streak: number
}

export default function WelcomeBanner({ fullName, branch, streak }: Props) {
  const [greeting, setGreeting] = useState('Bonjour')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bonjour')
    else if (hour < 18) setGreeting('Bon après-midi')
    else setGreeting('Bonsoir')
  }, [])

  const firstName = fullName.split(' ')[0] || fullName

  return (
    <div className="rounded-xl p-6 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${branch.color}15 0%, ${branch.color}05 100%)`, border: `1px solid ${branch.color}25` }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: branch.color, transform: 'translate(30%, -30%)' }} />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{greeting},</p>
          <h1 className="font-cinzel text-2xl font-bold text-white">
            {firstName} <span style={{ color: branch.color }}>⚔️</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Prépare ton examen{' '}
            <span className="font-semibold" style={{ color: branch.color }}>{branch.exam_provider}</span>
            {' '}· {branch.name}
          </p>
        </div>
        {streak > 0 && (
          <div className="text-center px-5 py-3 rounded-xl flex-shrink-0"
            style={{ background: `${branch.color}10`, border: `1px solid ${branch.color}25` }}>
            <p className="text-2xl mb-1">🔥</p>
            <p className="font-cinzel text-xl font-bold" style={{ color: branch.color }}>{streak}</p>
            <p className="text-gray-500 text-xs">jours</p>
          </div>
        )}
      </div>
    </div>
  )
}
