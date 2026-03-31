'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen, Swords, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const COMING_SOON_MODULES = [
  { icon: '📐', title: 'Règles de conduite', progress: 72, color: '#4D8BFF' },
  { icon: '📊', title: 'Analyse financière', progress: 55, color: '#D4A843' },
  { icon: '🛡️', title: 'Conformité & éthique', progress: 41, color: '#25C292' },
  { icon: '📜', title: 'Lois sur les valeurs mobilières', progress: 28, color: '#F59E0B' },
  { icon: '💹', title: "Produits d'investissement", progress: 15, color: '#FF4D6A' },
]

export default function ModulesPage() {
  const { user } = useAuth()
  const [globalProgress] = useState(65)
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setPulsing(p => !p), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={28} className="text-[#D4A843]" />
        <div>
          <h1 className="font-cinzel text-3xl font-bold text-white">Modules</h1>
          <p className="text-gray-400 text-sm">Contenu de formation structuré</p>
        </div>
      </div>

      {/* Hero card */}
      <div
        className="rpg-card p-8 mb-6 text-center relative overflow-hidden"
        style={{ borderColor: 'rgba(212,168,67,0.25)', background: 'rgba(212,168,67,0.03)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(212,168,67,0.06) 0%, transparent 70%)', opacity: pulsing ? 1 : 0.4 }}
        />

        <div className="relative">
          <div className="text-5xl mb-4 animate-float">🏗️</div>
          <h2 className="font-cinzel text-white text-2xl font-bold mb-2">
            Modules en développement
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Du contenu de formation exclusif calibré pour l'examen AMF arrive bientôt.
            Continue à t'entraîner sur les mini-jeux pendant ce temps !
          </p>

          {/* Global progress bar */}
          <div className="max-w-sm mx-auto mb-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">Progression globale</span>
              <span className="text-[#D4A843] font-semibold">{globalProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${globalProgress}%`,
                  background: 'linear-gradient(90deg, #D4A843, #F5C842)',
                }}
              />
            </div>
          </div>
          <p className="text-gray-600 text-xs mb-6">Préparation des contenus en cours...</p>

          <Link
            href="/games"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
          >
            <Swords size={16} />
            Jouer aux mini-jeux
          </Link>
        </div>
      </div>

      {/* Teaser list */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-[#D4A843]" />
        <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Aperçu des modules à venir</span>
      </div>

      <div className="space-y-3">
        {COMING_SOON_MODULES.map((mod, i) => (
          <div
            key={i}
            className="rpg-card px-5 py-4 flex items-center gap-4"
            style={{ opacity: 0.65 }}
          >
            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${mod.color}10`, border: `1px solid ${mod.color}20` }}
            >
              {mod.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-white text-sm font-semibold truncate">{mod.title}</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280' }}
                >
                  <Lock size={8} /> Bientôt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${mod.progress}%`, background: `${mod.color}60` }}
                  />
                </div>
                <span className="text-gray-600 text-xs flex-shrink-0">{mod.progress}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
