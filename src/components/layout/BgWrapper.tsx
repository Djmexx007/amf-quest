'use client'

import { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { Bug, X, Send } from 'lucide-react'

const THEME_BG: Record<string, string> = {
  // ── Originaux ──────────────────────────────────────────────────
  galaxy:         'radial-gradient(ellipse at 20% 50%, #1E0A4A 0%, #0D0625 45%, #080A12 100%)',
  abyss:          'radial-gradient(ellipse at 75% 20%, #041828 0%, #020B18 50%, #010810 100%)',
  golden:         'radial-gradient(ellipse at 50% 80%, #2E1A00 0%, #1A0F00 55%, #0D0700 100%)',
  fire:           'radial-gradient(ellipse at 30% 25%, #380900 0%, #1E0500 55%, #0D0200 100%)',
  cosmic:         'radial-gradient(ellipse at 65% 35%, #0C0935 0%, #060518 55%, #030312 100%)',
  nebula:         'radial-gradient(ellipse at 40% 60%, #2D0835 0%, #160520 50%, #080A12 100%)',
  matrix:         'radial-gradient(ellipse at 50% 50%, #001E00 0%, #000D00 55%, #000800 100%)',
  diamond:        'radial-gradient(ellipse at 60% 35%, #001E30 0%, #000F1C 55%, #000810 100%)',
  // ── Nouveaux achetables ─────────────────────────────────────────
  aurora:         'radial-gradient(ellipse at 25% 75%, #003328 0%, #001A16 50%, #000C0A 100%)',
  ocean:          'radial-gradient(ellipse at 50% 25%, #001535 0%, #000A20 50%, #000510 100%)',
  forest:         'radial-gradient(ellipse at 35% 65%, #0A1800 0%, #050D00 55%, #020600 100%)',
  sunset:         'radial-gradient(ellipse at 50% 100%, #3A1000 0%, #200800 55%, #0D0400 100%)',
  volcanic:       'radial-gradient(ellipse at 30% 0%, #281000 0%, #160600 55%, #0A0300 100%)',
  neon:           'radial-gradient(ellipse at 50% 80%, #150030 0%, #08001A 55%, #04000E 100%)',
  holographic:    'radial-gradient(ellipse at 25% 75%, #001535 0%, #000820 50%, #001A18 100%)',
  // ── Exclusifs coffres ───────────────────────────────────────────
  toxic:          'radial-gradient(ellipse at 55% 45%, #122000 0%, #090F00 55%, #040800 100%)',
  vortex:         'radial-gradient(ellipse at 50% 50%, #06000F 0%, #030008 55%, #020005 100%)',
  astral:         'radial-gradient(ellipse at 45% 55%, #0A051E 0%, #050310 55%, #020208 100%)',
  interstellaire: 'radial-gradient(ellipse at 50% 50%, #010208 0%, #000103 55%, #000001 100%)',
  neant:          'radial-gradient(ellipse at 50% 50%, #020202 0%, #010101 55%, #000000 100%)',
}

// ── Bug Report FAB ─────────────────────────────────────────────────
function BugReportFab() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user) return null

  async function submit() {
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          page: typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      })
      if (res.ok) {
        setSent(true)
        setMessage('')
        setTimeout(() => { setSent(false); setOpen(false) }, 2000)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: 'rgba(13,18,35,0.9)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          color: '#6B7280',
        }}
        title="Signaler un bug"
      >
        <Bug size={16} />
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:w-96 rounded-2xl p-5 mb-0 sm:mb-0 animate-slide-up"
            style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bug size={16} className="text-[#FF4D6A]" />
                <p className="font-cinzel text-sm font-bold text-white">Signaler un problème</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {sent ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-green-400 font-semibold text-sm">Rapport envoyé, merci !</p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-xs mb-3">
                  Page : <span className="text-gray-400">{typeof window !== 'undefined' ? window.location.pathname : '—'}</span>
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder="Décris le problème rencontré..."
                  rows={4}
                  className="w-full bg-[#080A12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-[#FF4D6A]/50 mb-4"
                />
                <button
                  onClick={submit}
                  disabled={!message.trim() || sending}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #FF4D6A, #CC3A54)', color: '#fff' }}
                >
                  <Send size={14} />
                  {sending ? 'Envoi...' : 'Envoyer le rapport'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function BgWrapper({ children }: { children: React.ReactNode }) {
  const { bgTheme } = useUIStore()
  const bg = bgTheme ? THEME_BG[bgTheme] : '#080A12'
  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, transition: 'background 0.8s ease' }}>
      {children}
      <BugReportFab />
    </div>
  )
}
