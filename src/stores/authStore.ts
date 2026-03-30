'use client'

import { create } from 'zustand'
import type { UserRole, UserStatus } from '@/types'

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
  selected_branch_id: string | null
  branch_locked: boolean
}

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
    window.location.href = '/login'
  },
}))
