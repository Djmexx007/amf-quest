'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Lock, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { Module } from '@/types'

interface ModuleWithProgress extends Module {
  completion_pct: number
  questions_answered: number
  best_score: number
}

interface ModulesData {
  modules: ModuleWithProgress[]
  character_level: number
  branch_color: string
}

export default function ModulesPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ModulesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/modules')
      .then(r => r.json())
      .then(d => { if (d.modules) setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">📚</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">Chargement des modules...</p>
        </div>
      </div>
    )
  }

  if (!data || data.modules.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen size={28} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-3xl font-bold text-white">Modules</h1>
            <p className="text-gray-400 text-sm">Contenu de formation structuré</p>
          </div>
        </div>
        <div className="rpg-card p-10 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="font-cinzel text-white text-xl mb-2">Aucun module disponible</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Les modules de formation seront ajoutés prochainement. Continue à jouer pour préparer l'examen !
          </p>
        </div>
      </div>
    )
  }

  const branchColor = data.branch_color
  const level = data.character_level

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={28} style={{ color: branchColor }} />
        <div>
          <h1 className="font-cinzel text-3xl font-bold text-white">Modules</h1>
          <p className="text-gray-400 text-sm">Maîtrise les sujets de ton examen</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.modules.map((mod) => {
          const locked = mod.unlock_level > level
          const completed = mod.completion_pct >= 100

          return (
            <div
              key={mod.id}
              className="rpg-card p-5 flex items-center gap-4 transition-all"
              style={locked ? { opacity: 0.5 } : completed ? { borderColor: `${branchColor}40` } : {}}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: locked ? 'rgba(255,255,255,0.04)' : `${branchColor}15`, border: `1px solid ${locked ? 'rgba(255,255,255,0.08)' : branchColor + '30'}` }}
              >
                {locked ? '🔒' : mod.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm truncate">{mod.title}</h3>
                  {completed && <CheckCircle2 size={14} style={{ color: branchColor }} className="flex-shrink-0" />}
                  {locked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280' }}>
                      <Lock size={8} /> Niv. {mod.unlock_level}
                    </span>
                  )}
                </div>
                {mod.description && (
                  <p className="text-gray-500 text-xs mb-2 truncate">{mod.description}</p>
                )}
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${mod.completion_pct}%`, background: locked ? '#6B7280' : branchColor }}
                    />
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0">{mod.completion_pct}%</span>
                </div>
              </div>

              {/* Stats */}
              {!locked && (
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">{mod.questions_answered} questions</p>
                  {mod.best_score > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: branchColor }}>Meilleur : {mod.best_score}</p>
                  )}
                </div>
              )}

              <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
