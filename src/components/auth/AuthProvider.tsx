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
  const { setBgTheme, setEquippedTitle, setSoundOnCorrect, setSoundOnWrong } = useUIStore()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!user.selected_branch_id) {
      router.push('/select-branch')
      return
    }
    if (ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, requiredRole])

  // Load equipped cosmetics (theme + title) once user has a branch
  useEffect(() => {
    if (!user?.selected_branch_id) return
    fetch('/api/user/character')
      .then(r => r.json())
      .then((data: { equipped_items?: { item_type: string; effect: Record<string, unknown> }[] }) => {
        const items = data.equipped_items ?? []
        const cosmetic   = items.find(i => i.item_type === 'cosmetic' && i.effect?.background)
        const titleItem  = items.find(i => i.item_type === 'title'    && i.effect?.title)
        const correctSnd = items.find(i => i.item_type === 'sound'    && i.effect?.trigger === 'correct')
        const wrongSnd   = items.find(i => i.item_type === 'sound'    && i.effect?.trigger === 'wrong')
        setBgTheme(cosmetic  ? String(cosmetic.effect.background) : null)
        setEquippedTitle(titleItem  ? String(titleItem.effect.title)    : null)
        setSoundOnCorrect(correctSnd ? String(correctSnd.effect.sound)  : null)
        setSoundOnWrong(wrongSnd     ? String(wrongSnd.effect.sound)    : null)
      })
      .catch(() => {})
  }, [user?.id, user?.selected_branch_id])

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
