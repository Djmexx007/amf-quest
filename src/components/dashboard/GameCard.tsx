import Link from 'next/link'
import type { Branch } from '@/types'

interface GameCardProps {
  title: string
  description: string
  icon: string
  href: string
  xpRange: string
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
  branch: Branch
  isNew?: boolean
}

const DIFF_COLORS = {
  Facile: '#25C292',
  Moyen: '#F59E0B',
  Difficile: '#FF4D6A',
}

export default function GameCard({
  title, description, icon, href, xpRange, difficulty, branch, isNew,
}: GameCardProps) {
  return (
    <Link href={href} className="block group">
      <div
        className="rpg-card p-5 h-full transition-all duration-300 group-hover:scale-[1.02] relative overflow-hidden"
        style={{ '--glow-color': `${branch.color}40` } as React.CSSProperties}
      >
        {isNew && (
          <div
            className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: branch.color, color: '#080A12' }}
          >
            NEW
          </div>
        )}

        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="font-cinzel font-bold text-white text-base mb-2">{title}</h3>
        <p className="text-gray-400 text-xs leading-relaxed mb-4">{description}</p>

        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{ color: DIFF_COLORS[difficulty] }}
          >
            {difficulty}
          </span>
          <span className="text-xs text-gray-500">+{xpRange} XP</span>
        </div>
      </div>
    </Link>
  )
}
