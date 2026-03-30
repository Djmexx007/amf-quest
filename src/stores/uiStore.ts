'use client'

import { create } from 'zustand'
import type { Toast } from '@/types'

interface UIStore {
  toasts: Toast[]
  sidebarOpen: boolean
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  toggleSidebar: () => void
}

let toastId = 0

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  sidebarOpen: true,
  addToast: (toast) => {
    const id = String(++toastId)
    const duration = toast.duration ?? 4000
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
