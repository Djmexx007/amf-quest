'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    // Only fetch if we don't have user data yet
    if (user) return

    setLoading(true)
    fetch('/api/user/me')
      .then((r) => {
        if (!r.ok) {
          setUser(null)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data?.user) setUser(data.user)
        else setUser(null)
      })
      .catch(() => setUser(null))
  }, [user, setUser, setLoading])

  return { user, isLoading, logout }
}
