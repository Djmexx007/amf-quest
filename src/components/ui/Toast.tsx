'use client'

import { useUIStore } from '@/stores/uiStore'
import { X } from 'lucide-react'

const TYPE_STYLES = {
  success: { border: '#25C292', bg: 'rgba(37,194,146,0.1)', icon: '✓' },
  error:   { border: '#FF4D6A', bg: 'rgba(255,77,106,0.1)', icon: '✗' },
  warning: { border: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '⚠' },
  info:    { border: '#4D8BFF', bg: 'rgba(77,139,255,0.1)', icon: 'ℹ' },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const style = TYPE_STYLES[toast.type]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl min-w-[300px] max-w-[400px] animate-slide-up"
            style={{
              background: style.bg,
              border: `1px solid ${style.border}40`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="text-lg mt-0.5" style={{ color: style.border }}>
              {style.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{toast.title}</p>
              {toast.message && (
                <p className="text-gray-400 text-xs mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
