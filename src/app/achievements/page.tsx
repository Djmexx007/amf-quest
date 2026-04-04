'use client'

import { useEffect, useState } from 'react'
import { Trophy, Lock } from 'lucide-react'

interface Achievement {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  condition_type: string
  condition_value: number
  xp_reward: number
  coin_reward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  unlocked_at: string | null
}

interface Stats {
  total: number
  unlocked: number
  by_rarity: Record<string, { total: number; unlocked: number }>
}

const RARITY = {
  common:    { label: 'Commun',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.15)' },
  rare:      { label: 'Rare',       color: '#4D8BFF', bg: 'rgba(77,139,255,0.08)',  border: 'rgba(77,139,255,0.2)'  },
  epic:      { label: 'Épique',     color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  legendary: { label: 'Légendaire', color: '#D4A843', bg: 'rgba(212,168,67,0.08)',  border: 'rgba(212,168,67,0.25)' },
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [rarityFilter, setRarityFilter] = useState('all')

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(d => {
        setAchievements(d.achievements ?? [])
        setStats(d.stats ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = achievements.filter(a => {
    if (filter === 'unlocked' && !a.unlocked) return false
    if (filter === 'locked' && a.unlocked) return false
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false
    return true
  })

  const pct = stats ? Math.round((stats.unlocked / stats.total) * 100) : 0

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={28} className="text-[#D4A843]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Succès</h1>
          <p className="text-gray-500 text-sm">Débloque des récompenses en progressant</p>
        </div>
      </div>

      {/* Global progress */}
      {stats && (
        <div className="rpg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold">{stats.unlocked} / {stats.total} débloqués</span>
            <span className="text-[#D4A843] font-cinzel font-bold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #D4A843, #D4A84380)' }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(RARITY) as [keyof typeof RARITY, typeof RARITY[keyof typeof RARITY]][]).map(([key, rc]) => {
              const r = stats.by_rarity[key] ?? { total: 0, unlocked: 0 }
              return (
                <div key={key} className="text-center p-2 rounded-lg" style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>
                  <p className="text-xs font-semibold" style={{ color: rc.color }}>{rc.label}</p>
                  <p className="text-white font-bold text-lg leading-none mt-1">{r.unlocked}</p>
                  <p className="text-gray-600 text-xs">/ {r.total}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all',      label: 'Tous' },
          { value: 'unlocked', label: '✓ Débloqués' },
          { value: 'locked',   label: '🔒 Verrouillés' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value as typeof filter)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: filter === f.value ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === f.value ? '#D4A843' : 'rgba(255,255,255,0.08)'}`,
              color: filter === f.value ? '#D4A843' : '#6B7280',
            }}>
            {f.label}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          {['all', ...Object.keys(RARITY)].map(r => {
            const conf = r === 'all' ? { label: 'Tout', color: '#6B7280' } : RARITY[r as keyof typeof RARITY]
            return (
              <button key={r} onClick={() => setRarityFilter(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: rarityFilter === r ? `${conf.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${rarityFilter === r ? conf.color : 'rgba(255,255,255,0.08)'}`,
                  color: rarityFilter === r ? conf.color : '#6B7280',
                }}>
                {r === 'all' ? 'Tout' : (conf as typeof RARITY[keyof typeof RARITY]).label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rpg-card h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rpg-card p-12 text-center">
          <Trophy size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">Aucun succès dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(ach => {
            const rc = RARITY[ach.rarity]
            return (
              <div key={ach.id}
                className="rpg-card p-4 flex flex-col items-center text-center transition-all duration-200 relative overflow-hidden"
                style={{
                  border: `1px solid ${ach.unlocked ? rc.border : 'rgba(255,255,255,0.04)'}`,
                  background: ach.unlocked ? rc.bg : '#0A0D18',
                  opacity: ach.unlocked ? 1 : 0.55,
                }}>

                {/* Rarity badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${rc.color}20`, color: rc.color }}>
                    {rc.label}
                  </span>
                </div>

                {/* Icon */}
                <div className="relative mb-2 mt-1">
                  <span className="text-4xl">{ach.icon}</span>
                  {!ach.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={16} className="text-gray-600" />
                    </div>
                  )}
                </div>

                <p className="text-white text-sm font-semibold leading-tight mb-1">{ach.title}</p>
                <p className="text-gray-500 text-xs leading-tight mb-3 flex-1">{ach.description}</p>

                {/* Rewards */}
                <div className="flex gap-2 text-xs">
                  {ach.xp_reward > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(212,168,67,0.12)', color: '#D4A843' }}>
                      +{ach.xp_reward} XP
                    </span>
                  )}
                  {ach.coin_reward > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(37,194,146,0.12)', color: '#25C292' }}>
                      +{ach.coin_reward} 💰
                    </span>
                  )}
                </div>

                {ach.unlocked && ach.unlocked_at && (
                  <p className="text-gray-700 text-[10px] mt-2">
                    {new Date(ach.unlocked_at).toLocaleDateString('fr-CA')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
