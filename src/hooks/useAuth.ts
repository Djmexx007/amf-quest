'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, isLoading, setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    if (user) return

    setLoading(true)

    fetch('/api/user/me')
      .then(async (r) => {
        if (r.ok) return r.json()
        if (r.status === 401) {
          // Access token expired — try silent refresh
          const rr = await fetch('/api/auth/refresh', { method: 'POST' })
          if (rr.ok) {
            const r2 = await fetch('/api/user/me')
            if (r2.ok) return r2.json()
          }
        }
        return null
      })
      .then((data) => {
        if (data?.user) setUser(data.user)
        else setUser(null)
      })
      .catch(() => setUser(null))
  }, [user, setUser, setLoading])

  return { user, isLoading, logout }
}
