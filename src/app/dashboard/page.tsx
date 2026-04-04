'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import CharacterPanel from '@/components/dashboard/CharacterPanel'
import MissionsList from '@/components/dashboard/MissionsList'
import WelcomeBanner from '@/components/dashboard/WelcomeBanner'
import DailyRewardWidget from '@/components/dashboard/DailyRewardWidget'
import Link from 'next/link'
import { Swords } from 'lucide-react'
import type { Character, Branch, DailyMission } from '@/types'

interface DashboardData {
  character: Character
  branch: Branch
  missions: DailyMission[]
}

const FEATURED_GAMES = [
  { title: 'Quiz Éclair',      icon: '⚡',  href: '/games/quiz',       xpRange: '30–400',  difficulty: 'Moyen' as const },
  { title: 'Donjon Roguelike', icon: '🏰',  href: '/games/dungeon',    xpRange: '100–600', difficulty: 'Difficile' as const, isNew: true },
  { title: 'Scénario Client',  icon: '👔',  href: '/games/scenario',   xpRange: '75–250',  difficulty: 'Moyen' as const },
  { title: 'Le Régulateur',    icon: '🔍',  href: '/games/detective',  xpRange: '100–400', difficulty: 'Difficile' as const },
]

const DIFFICULTY_COLOR = { Facile: '#25C292', Moyen: '#F59E0B', Difficile: '#FF4D6A' } as const

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  function handleDailyClaim(xp: number, coins: number, streak: number) {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        character: {
          ...prev.character,
          xp: prev.character.xp + xp,
          coins: prev.character.coins + coins,
          login_streak: streak,
        },
      }
    })
  }

  useEffect(() => {
    fetch('/api/user/missions/generate', { method: 'POST' }).catch(() => {})
    fetch('/api/user/dashboard')
      .then(r => r.json())
      .then(d => { if (d.character) setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">⚔️</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">Chargement du royaume...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="rpg-card p-8 text-center max-w-md mx-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-cinzel text-white text-xl mb-2">Erreur de chargement</h2>
          <p className="text-gray-400 text-sm">Impossible de charger ton profil. Réessaie plus tard.</p>
        </div>
      </div>
    )
  }

  const branchColor = data.branch.color

  return (
    <div className="page-container space-y-6">
      <WelcomeBanner
        fullName={user?.full_name ?? ''}
        branch={data.branch}
        streak={data.character.streak_days}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        {/* Left: progression + play */}
        <div className="xl:col-span-2 space-y-6">
          <CharacterPanel character={data.character} branch={data.branch} />

          {/* Primary CTA */}
          <Link
            href="/games"
            className="flex items-center justify-center gap-3 py-4 rounded-2xl font-cinzel font-bold text-lg tracking-widest transition-all hover:scale-[1.02] active:scale-[0.99] group"
            style={{
              background: `linear-gradient(135deg, ${branchColor}, ${branchColor}BB)`,
              color: '#080A12',
              boxShadow: `0 0 32px ${branchColor}40`,
            }}
          >
            <Swords size={22} className="group-hover:rotate-12 transition-transform" />
            JOUER MAINTENANT
          </Link>

          {/* Featured games */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cinzel text-white font-bold tracking-wide">Mini-jeux</h2>
              <Link href="/games" className="text-xs text-gray-500 hover:text-[#D4A843] transition-colors">
                Voir tous →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FEATURED_GAMES.map(game => (
                <Link
                  key={game.href}
                  href={game.href}
                  className="rpg-card p-4 flex items-start gap-3 transition-all hover:scale-[1.02] group"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="text-2xl flex-shrink-0">{game.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-white text-sm font-semibold truncate">{game.title}</p>
                      {game.isNew && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-bold flex-shrink-0"
                          style={{ background: `${branchColor}20`, color: branchColor }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold"
                        style={{ color: DIFFICULTY_COLOR[game.difficulty] }}>
                        {game.difficulty}
                      </span>
                      <span className="text-gray-600 text-xs">{game.xpRange} XP</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: daily + missions */}
        <div className="space-y-6">
          <DailyRewardWidget
            loginStreak={data.character.login_streak ?? 0}
            alreadyClaimed={data.character.last_daily_reward_date === new Date().toISOString().split('T')[0]}
            branchColor={branchColor}
            onClaim={handleDailyClaim}
          />
          <MissionsList missions={data.missions} branch={data.branch} />
        </div>
      </div>
    </div>
  )
}
