'use client'

import { useEffect, useState } from 'react'
import { Shield, Clock, RefreshCw } from 'lucide-react'

export default function MaintenancePage() {
  const [checking, setChecking] = useState(false)
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
    return () => clearInterval(iv)
  }, [])

  async function checkBack() {
    setChecking(true)
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) window.location.href = '/dashboard'
    } catch { /* still in maintenance */ }
    finally { setChecking(false) }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.08) 0%, #080A12 60%)',
      }}
    >
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              background: '#D4A843',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 3}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(212,168,67,0.1)',
              border: '1px solid rgba(212,168,67,0.25)',
            }}
          >
            <Shield size={56} className="text-[#D4A843]" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="font-cinzel text-3xl font-bold text-white mb-3">
            Maintenance en cours
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Les dieux de l'AMF affûtent leurs épées.
            <br />
            Le royaume sera de retour très bientôt{dots}
          </p>
        </div>

        {/* Status card */}
        <div
          className="p-5 rounded-xl text-left space-y-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse" />
            <span className="text-[#D4A843] text-sm font-semibold">Maintenance planifiée</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={16} className="text-gray-500 mt-0.5 shrink-0" />
            <p className="text-gray-400 text-sm">
              Des améliorations importantes sont en cours de déploiement. Votre progression est sauvegardée.
            </p>
          </div>
        </div>

        {/* Retry button */}
        <button
          onClick={checkBack}
          disabled={checking}
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: checking ? 'rgba(212,168,67,0.05)' : 'rgba(212,168,67,0.15)',
            border: '1px solid rgba(212,168,67,0.3)',
            color: '#D4A843',
            cursor: checking ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Vérification...' : 'Vérifier si disponible'}
        </button>

        <p className="text-gray-600 text-xs">
          AMF Quest — Plateforme de formation certifiée
        </p>
      </div>
    </div>
  )
}
