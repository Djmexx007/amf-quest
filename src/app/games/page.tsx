'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const GAMES = [
  {
    title: 'Quiz Éclair',
    description: 'Questions chronométrées avec bonus de vitesse et de série.',
    icon: '⚡',
    href: '/games/quiz',
    xpRange: '30–400',
    difficulty: 'Moyen',
    difficultyColor: '#F59E0B',
  },
  {
    title: 'Donjon Roguelike',
    description: 'Explore des salles, réponds aux questions, bats le boss.',
    icon: '🏰',
    href: '/games/dungeon',
    xpRange: '100–600',
    difficulty: 'Difficile',
    difficultyColor: '#FF4D6A',
    isNew: true,
  },
  {
    title: 'Memory Match',
    description: 'Associe les termes à leurs définitions sur une grille.',
    icon: '🃏',
    href: '/games/memory',
    xpRange: '50–200',
    difficulty: 'Facile',
    difficultyColor: '#25C292',
  },
  {
    title: 'Speed Sort',
    description: 'Classe les produits financiers à toute vitesse.',
    icon: '🌪️',
    href: '/games/speed-sort',
    xpRange: '50–300',
    difficulty: 'Moyen',
    difficultyColor: '#F59E0B',
  },
  {
    title: 'Scénario Client',
    description: 'Tu es le conseiller — choisis la bonne recommandation.',
    icon: '👔',
    href: '/games/scenario',
    xpRange: '75–250',
    difficulty: 'Moyen',
    difficultyColor: '#F59E0B',
  },
  {
    title: 'Le Régulateur',
    description: 'Trouve les infractions cachées dans le dossier client.',
    icon: '🔍',
    href: '/games/detective',
    xpRange: '100–400',
    difficulty: 'Difficile',
    difficultyColor: '#FF4D6A',
  },
  {
    title: 'Trivia Crack',
    description: 'Roue tournante avec 6 catégories et couronnes à collectionner.',
    icon: '🎯',
    href: '/games/trivia-crack',
    xpRange: '30–200',
    difficulty: 'Facile',
    difficultyColor: '#25C292',
  },
  {
    title: 'Platformer 2D',
    description: 'Cours, saute et réponds aux questions pour progresser.',
    icon: '🕹️',
    href: '/games/platformer',
    xpRange: '50–350',
    difficulty: 'Moyen',
    difficultyColor: '#F59E0B',
    isNew: true,
  },
]

export default function GamesPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-cinzel text-3xl font-bold text-white mb-2">Mini-jeux</h1>
        <p className="text-gray-400">Choisis ton combat et gagne de l'XP pour monter en niveau.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GAMES.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className="rpg-card p-5 flex flex-col gap-3 hover:border-[#D4A843]/30 transition-all group cursor-pointer"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{game.icon}</span>
              <div className="flex flex-col items-end gap-1">
                {game.isNew && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }}>
                    NOUVEAU
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${game.difficultyColor}15`, color: game.difficultyColor }}>
                  {game.difficulty}
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-cinzel font-bold text-white text-sm group-hover:text-[#D4A843] transition-colors">
                {game.title}
              </h3>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">{game.description}</p>
            </div>

            <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-gray-600 text-xs">XP</span>
              <span className="text-xs font-semibold" style={{ color: user?.role === 'user' ? '#25C292' : '#D4A843' }}>
                +{game.xpRange}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
