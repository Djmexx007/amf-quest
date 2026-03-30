'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

const ROLE_RANK: Record<UserRole, number> = {
  user: 0, moderator: 1, admin: 2, god: 3,
}

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function AuthProvider({ children, requiredRole = 'user' }: Props) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

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
