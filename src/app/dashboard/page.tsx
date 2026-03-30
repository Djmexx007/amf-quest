'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import CharacterPanel from '@/components/dashboard/CharacterPanel'
import MissionsList from '@/components/dashboard/MissionsList'
import Leaderboard from '@/components/dashboard/Leaderboard'
import WelcomeBanner from '@/components/dashboard/WelcomeBanner'
import GameCard from '@/components/dashboard/GameCard'
import Link from 'next/link'
import type { Character, Branch, DailyMission } from '@/types'

interface RecentAchievement {
  achievement_id: string
  unlocked_at: string
  achievements: { title: string; icon: string; rarity: string }
}

interface EquippedItem {
  item_id: string
  shop_items: { name: string; icon: string; item_type: string; rarity: string }
}

interface DashboardData {
  character: Character
  branch: Branch
  missions: DailyMission[]
  recent_sessions: Array<{
    id: string
    game_type: string
    score: number
    xp_earned: number
    coins_earned: number
    questions_correct: number
    questions_total: number
    completed_at: string
  }>
  leaderboard: Array<{
    user_id: string
    name: string
    level: number
    class_name: string
    xp: number
    streak_days: number
    full_name: string
  }>
  recent_achievements: RecentAchievement[]
  equipped_items: EquippedItem[]
}

const RARITY_COLOR: Record<string, string> = {
  common: '#9CA3AF', rare: '#4D8BFF', epic: '#A78BFA', legendary: '#D4A843',
}

function getRank(level: number): { rank: string; color: string; next: number } {
  if (level < 5)  return { rank: 'Novice',        color: '#9CA3AF', next: 5  }
  if (level < 10) return { rank: 'Initié',         color: '#25C292', next: 10 }
  if (level < 15) return { rank: 'Intermédiaire',  color: '#4D8BFF', next: 15 }
  if (level < 20) return { rank: 'Avancé',         color: '#F59E0B', next: 20 }
  if (level < 30) return { rank: 'Expert',         color: '#A78BFA', next: 30 }
  if (level < 40) return { rank: 'Maître',         color: '#FF4D6A', next: 40 }
  return           { rank: 'Légendaire',            color: '#D4A843', next: 50 }
}

const GAMES = [
  {
    title: 'Quiz Éclair',
    description: 'Questions chronométrées avec bonus de vitesse et de série.',
    icon: '⚡',
    href: '/games/quiz',
    xpRange: '30–400',
    difficulty: 'Moyen' as const,
  },
  {
    title: 'Donjon Roguelike',
    description: 'Explore des salles, réponds aux questions, bats le boss.',
    icon: '🏰',
    href: '/games/dungeon',
    xpRange: '100–600',
    difficulty: 'Difficile' as const,
    isNew: true,
  },
  {
    title: 'Memory Match',
    description: 'Associe les termes à leurs définitions sur une grille.',
    icon: '🃏',
    href: '/games/memory',
    xpRange: '50–200',
    difficulty: 'Facile' as const,
  },
  {
    title: 'Speed Sort',
    description: 'Classe les produits financiers à toute vitesse.',
    icon: '🌪️',
    href: '/games/speed-sort',
    xpRange: '50–300',
    difficulty: 'Moyen' as const,
  },
  {
    title: 'Scénario Client',
    description: 'Tu es le conseiller — choisis la bonne recommandation.',
    icon: '👔',
    href: '/games/scenario',
    xpRange: '75–250',
    difficulty: 'Moyen' as const,
  },
  {
    title: 'Le Régulateur',
    description: 'Trouve les infractions cachées dans le dossier client.',
    icon: '🔍',
    href: '/games/detective',
    xpRange: '100–400',
    difficulty: 'Difficile' as const,
  },
  {
    title: 'Trivia Crack',
    description: 'Roue tournante avec 6 catégories et couronnes à collectionner.',
    icon: '🎯',
    href: '/games/trivia-crack',
    xpRange: '30–200',
    difficulty: 'Facile' as const,
  },
  {
    title: 'Platformer 2D',
    description: 'Cours, saute et réponds aux questions pour progresser.',
    icon: '🕹️',
    href: '/games/platformer',
    xpRange: '50–350',
    difficulty: 'Moyen' as const,
    isNew: true,
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate today's missions (no-op if already exists)
    fetch('/api/user/missions/generate', { method: 'POST' }).catch(() => {})

    fetch('/api/user/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.character) setData(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">⚔️</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">
            Chargement du royaume...
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center rpg-card p-8 max-w-md mx-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-cinzel text-white text-xl mb-2">Erreur de chargement</h2>
          <p className="text-gray-400 text-sm">Impossible de charger ton profil. Réessaie plus tard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <WelcomeBanner
        fullName={user?.full_name ?? ''}
        branch={data.branch}
        streak={data.character.streak_days}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: character + missions */}
        <div className="xl:col-span-2 space-y-6">
          <CharacterPanel character={data.character} branch={data.branch} />

          {/* Games grid */}
          <div>
            <h2 className="font-cinzel text-lg font-bold text-white mb-4 tracking-wide">
              Mini-jeux
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {GAMES.map((game) => (
                <GameCard
                  key={game.href}
                  {...game}
                  branch={data.branch}
                />
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          {data.recent_sessions.length > 0 && (
            <div className="rpg-card p-6">
              <h3 className="font-cinzel font-bold text-white mb-4 tracking-wide">
                Parties récentes
              </h3>
              <div className="space-y-2">
                {data.recent_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white capitalize">{session.game_type}</p>
                      <p className="text-xs text-gray-500">
                        {session.questions_correct}/{session.questions_total} correctes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: data.branch.color }}>
                        +{session.xp_earned} XP
                      </p>
                      <p className="text-xs text-gray-600">
                        Score: {session.score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: rank + missions + achievements + leaderboard */}
        <div className="space-y-6">

          {/* Rank widget */}
          {(() => {
            const rank = getRank(data.character.level)
            const progressToNext = data.character.level < rank.next
              ? ((data.character.level - (rank.next - 5)) / 5) * 100
              : 100
            return (
              <div className="rpg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Rang</h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: `${rank.color}20`, color: rank.color }}>
                    {rank.rank}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-cinzel font-black" style={{ color: rank.color }}>
                    Nv.{data.character.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{data.character.class_name}</span>
                      <span>→ Nv.{rank.next}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(progressToNext, 100)}%`, background: rank.color }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-white font-bold text-sm">{data.character.xp.toLocaleString()}</p>
                    <p className="text-gray-600 text-xs">XP total</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{data.character.coins.toLocaleString()}</p>
                    <p className="text-gray-600 text-xs">Coins</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{data.character.streak_days}</p>
                    <p className="text-gray-600 text-xs">Jours 🔥</p>
                  </div>
                </div>
              </div>
            )
          })()}

          <MissionsList missions={data.missions} branch={data.branch} />

          {/* Recent achievements */}
          {data.recent_achievements.length > 0 && (
            <div className="rpg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Succès récents</h3>
                <Link href="/achievements" className="text-xs text-gray-500 hover:text-[#D4A843] transition-colors">
                  Voir tout →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {data.recent_achievements.slice(0, 6).map(ua => {
                  const ach = ua.achievements
                  const color = RARITY_COLOR[ach.rarity] ?? '#9CA3AF'
                  return (
                    <div key={ua.achievement_id}
                      className="flex flex-col items-center p-2 rounded-lg text-center"
                      style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                      title={ach.title}>
                      <span className="text-2xl mb-1">{ach.icon}</span>
                      <p className="text-[10px] text-gray-400 leading-tight truncate w-full">{ach.title}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Equipped items */}
          {data.equipped_items.length > 0 && (
            <div className="rpg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">Équipement actif</h3>
                <Link href="/shop" className="text-xs text-gray-500 hover:text-[#D4A843] transition-colors">
                  Boutique →
                </Link>
              </div>
              <div className="flex gap-2 flex-wrap">
                {data.equipped_items.map(inv => {
                  const item = inv.shop_items
                  const color = RARITY_COLOR[item.rarity] ?? '#9CA3AF'
                  return (
                    <div key={inv.item_id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-semibold" style={{ color }}>{item.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Leaderboard
            entries={data.leaderboard}
            branch={data.branch}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </div>
  )
}
