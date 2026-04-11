'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Lock, ChevronRight, Trophy, Target, Swords } from 'lucide-react'

interface Module {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  unlock_level: number
  order_index: number
  completion_pct: number
  questions_answered: number
  best_score: number
}

const MODULE_UNLOCK_LEVEL = 5

export default function ModulesPage() {
  const [modules, setModules]   = useState<Module[]>([])
  const [level, setLevel]       = useState<number | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/modules')
      .then(r => r.json())
      .then(d => {
        setModules(d.modules ?? [])
        setLevel(d.character_level ?? 1)
        if (d.branch_color) setBranchColor(d.branch_color)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">📚</div>
          <p className="text-gray-500 text-sm font-cinzel tracking-widest">Chargement…</p>
        </div>
      </div>
    )
  }

  const locked = level !== null && level < MODULE_UNLOCK_LEVEL
  const xpToUnlock = locked ? `Niveau ${MODULE_UNLOCK_LEVEL} requis` : null

  return (
    <div className="page-container space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen size={26} style={{ color: branchColor }} />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Modules d'examen</h1>
          <p className="text-gray-400 text-sm">Pratique d'examen officielle — Ressent le vrai examen</p>
        </div>
      </div>

      {/* Locked state */}
      {locked && (
        <div
          className="rpg-card p-8 text-center relative overflow-hidden"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(212,168,67,0.04) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
              <Lock size={28} style={{ color: '#D4A843' }} />
            </div>
            <h2 className="font-cinzel text-xl font-bold text-white mb-2">Modules verrouillés</h2>
            <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
              Atteins le <strong className="text-white">niveau {MODULE_UNLOCK_LEVEL}</strong> pour débloquer les
              modules d'examen. Continue à jouer aux mini-jeux pour progresser.
            </p>
            <div className="max-w-xs mx-auto mb-2">
              <div className="flex justify-between text-xs mb-1.5 text-gray-500">
                <span>Niveau actuel: <strong className="text-white">{level}</strong></span>
                <span>Objectif: <strong className="text-white">{MODULE_UNLOCK_LEVEL}</strong></span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((level ?? 0) / MODULE_UNLOCK_LEVEL) * 100)}%`,
                    background: 'linear-gradient(90deg, #D4A843, #F5C842)',
                  }}
                />
              </div>
            </div>
            <p className="text-gray-600 text-xs mb-6">{xpToUnlock}</p>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
            >
              <Swords size={15} /> Gagner de l'XP
            </Link>
          </div>
        </div>
      )}

      {/* Module grid */}
      {!locked && modules.length === 0 && (
        <div className="rpg-card p-10 text-center">
          <p className="text-gray-500 text-sm">Aucun module disponible pour ta branche pour l'instant.</p>
        </div>
      )}

      {!locked && modules.length > 0 && (
        <>
          {/* Info banner */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
            style={{ background: `${branchColor}0d`, border: `1px solid ${branchColor}25` }}
          >
            <Target size={16} style={{ color: branchColor }} className="flex-shrink-0" />
            <p style={{ color: branchColor }}>
              Simule les conditions réelles d'examen — timer, sans feedback instantané,
              révision complète à la fin. Seuil de réussite : <strong>60 %</strong>.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => {
              const passed = mod.best_score >= 60
              const attempted = mod.best_score > 0

              return (
                <Link
                  key={mod.id}
                  href={`/modules/${mod.slug}`}
                  className="rpg-card p-5 flex flex-col gap-4 hover:border-white/15 transition-all group cursor-pointer"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${branchColor}12`, border: `1px solid ${branchColor}20` }}
                    >
                      {mod.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {attempted && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={passed
                            ? { background: 'rgba(37,194,146,0.15)', color: '#25C292' }
                            : { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                        >
                          <Trophy size={8} />
                          {passed ? 'RÉUSSI' : 'EN COURS'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title + description */}
                  <div className="flex-1">
                    <h3 className="font-cinzel font-bold text-white text-sm group-hover:text-[#D4A843] transition-colors mb-1">
                      {mod.title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>

                  {/* Stats */}
                  {attempted ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Meilleur score</span>
                        <span
                          className="font-bold"
                          style={{ color: passed ? '#25C292' : '#F59E0B' }}
                        >
                          {mod.best_score}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${mod.best_score}%`,
                            background: passed
                              ? 'linear-gradient(90deg, #25C292, #1fa876)'
                              : 'linear-gradient(90deg, #F59E0B, #D4A843)',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 italic">Pas encore tenté</div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-gray-600 text-xs">
                      {mod.questions_answered > 0
                        ? `${mod.questions_answered} q. répondues`
                        : 'Commencer'}
                    </span>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-[#D4A843] transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
