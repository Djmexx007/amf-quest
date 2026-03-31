'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import type { UserRole } from '@/types'

const ROLE_RANK: Record<UserRole, number> = {
  user: 0, moderator: 1, god: 2,
}

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function AuthProvider({ children, requiredRole = 'user' }: Props) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { setBgTheme, setEquippedTitle } = useUIStore()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, requiredRole])

  // Load equipped cosmetics (theme + title) once user is known
  useEffect(() => {
    if (!user) return
    fetch('/api/user/character')
      .then(r => r.json())
      .then((data: { equipped_items?: { item_type: string; effect: Record<string, unknown> }[] }) => {
        const items = data.equipped_items ?? []
        const cosmetic = items.find(i => i.item_type === 'cosmetic' && i.effect?.background)
        setBgTheme(cosmetic ? String(cosmetic.effect.background) : null)
        const titleItem = items.find(i => i.item_type === 'title' && i.effect?.title)
        setEquippedTitle(titleItem ? String(titleItem.effect.title) : null)
      })
      .catch(() => {})
  }, [user?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080A12] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-float">⚔️</div>
          <p className="font-cinzel text-[#D4A843] text-sm tracking-widest animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
