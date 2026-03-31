'use client'

import { useState, useRef } from 'react'
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

// Per-theme CSS injected into a <style> tag to style .rpg-card, borders, etc.
const THEME_CSS: Record<string, string> = {
  neon: `
    [data-theme="neon"] .rpg-card {
      animation: neon-border-pulse 2.2s ease-in-out infinite;
      background: rgba(10,0,22,0.92) !important;
    }
    [data-theme="neon"] .rpg-card:hover {
      box-shadow: 0 0 30px rgba(255,0,230,0.35), 0 0 60px rgba(0,255,255,0.15) !important;
    }
  `,
  holographic: `
    [data-theme="holographic"] .rpg-card {
      animation: holo-border 4s linear infinite;
      background: rgba(5,8,20,0.9) !important;
    }
  `,
  matrix: `
    [data-theme="matrix"] .rpg-card {
      border-color: rgba(0,255,70,0.25) !important;
      box-shadow: 0 0 12px rgba(0,255,70,0.08) !important;
      background: rgba(0,10,0,0.95) !important;
    }
    [data-theme="matrix"] .rpg-card:hover {
      border-color: rgba(0,255,70,0.55) !important;
      box-shadow: 0 0 22px rgba(0,255,70,0.2) !important;
    }
    [data-theme="matrix"] p, [data-theme="matrix"] span, [data-theme="matrix"] h1,
    [data-theme="matrix"] h2, [data-theme="matrix"] h3 {
      text-shadow: 0 0 8px rgba(0,255,70,0.2);
    }
  `,
  diamond: `
    [data-theme="diamond"] .rpg-card {
      animation: diamond-shimmer 3s ease-in-out infinite;
      background: rgba(0,10,22,0.94) !important;
    }
    [data-theme="diamond"] .rpg-card:hover {
      box-shadow: 0 0 30px rgba(130,200,255,0.3) !important;
    }
  `,
  forest: `
    [data-theme="forest"] .rpg-card {
      border-color: rgba(60,130,30,0.35) !important;
      background: rgba(5,14,0,0.93) !important;
      position: relative;
    }
    [data-theme="forest"] .rpg-card:hover {
      border-color: rgba(80,180,40,0.55) !important;
      box-shadow: 0 0 20px rgba(60,160,30,0.15) !important;
    }
    [data-theme="forest"] .rpg-card::before {
      content: '';
      position: absolute;
      top: -10px;
      left: -8px;
      width: 36px;
      height: 36px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Cpath d='M14 2 C22 2 26 10 23 16 C20 22 12 25 6 20 C1 15 3 5 9 3 C11 2 14 2 14 2Z' fill='%234a8a3a' opacity='0.75'/%3E%3Cpath d='M14 6 C14 6 16 12 14 16 C12 12 14 6 14 6Z' fill='%23285a1a' opacity='0.6'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      pointer-events: none;
      z-index: 1;
      animation: forest-sway 4s ease-in-out infinite;
    }
    [data-theme="forest"] .rpg-card::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: -6px;
      width: 28px;
      height: 28px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Cpath d='M14 2 C22 2 26 10 23 16 C20 22 12 25 6 20 C1 15 3 5 9 3 C11 2 14 2 14 2Z' fill='%233d7530' opacity='0.6'/%3E%3Cpath d='M14 6 C14 6 16 12 14 16 C12 12 14 6 14 6Z' fill='%23204d10' opacity='0.5'/%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      pointer-events: none;
      z-index: 1;
      transform: rotate(120deg);
      animation: forest-sway 5s ease-in-out infinite reverse;
    }
  `,
  astral: `
    [data-theme="astral"] .rpg-card {
      border-color: rgba(160,120,255,0.3) !important;
      background: rgba(8,4,24,0.95) !important;
      position: relative;
    }
    [data-theme="astral"] .rpg-card:hover {
      border-color: rgba(200,160,255,0.5) !important;
      box-shadow: 0 0 25px rgba(160,100,255,0.2) !important;
    }
    [data-theme="astral"] .rpg-card::before {
      content: '✦';
      position: absolute;
      top: -1px;
      left: 4px;
      font-size: 12px;
      color: rgba(200,160,255,0.7);
      pointer-events: none;
      z-index: 1;
      animation: star-twinkle 2.5s ease-in-out infinite;
    }
    [data-theme="astral"] .rpg-card::after {
      content: '✦';
      position: absolute;
      bottom: -1px;
      right: 5px;
      font-size: 9px;
      color: rgba(180,140,255,0.5);
      pointer-events: none;
      z-index: 1;
      animation: star-twinkle 3.2s ease-in-out infinite 1s;
    }
  `,
  galaxy: `
    [data-theme="galaxy"] .rpg-card {
      border-color: rgba(120,60,200,0.3) !important;
      box-shadow: 0 0 15px rgba(80,20,160,0.12) !important;
      background: rgba(12,6,30,0.94) !important;
    }
    [data-theme="galaxy"] .rpg-card:hover {
      border-color: rgba(160,100,255,0.45) !important;
      box-shadow: 0 0 28px rgba(100,40,200,0.22) !important;
    }
  `,
  cosmic: `
    [data-theme="cosmic"] .rpg-card {
      border-color: rgba(80,100,220,0.3) !important;
      box-shadow: 0 0 12px rgba(60,80,200,0.1) !important;
      background: rgba(6,4,22,0.95) !important;
    }
    [data-theme="cosmic"] .rpg-card:hover {
      border-color: rgba(100,130,255,0.5) !important;
      box-shadow: 0 0 28px rgba(80,100,220,0.25) !important;
    }
  `,
  nebula: `
    [data-theme="nebula"] .rpg-card {
      border-color: rgba(180,60,200,0.3) !important;
      box-shadow: 0 0 12px rgba(140,30,170,0.12) !important;
      background: rgba(16,4,24,0.95) !important;
    }
    [data-theme="nebula"] .rpg-card:hover {
      border-color: rgba(220,80,240,0.45) !important;
      box-shadow: 0 0 28px rgba(180,40,200,0.22) !important;
    }
  `,
  golden: `
    [data-theme="golden"] .rpg-card {
      border-color: rgba(212,168,67,0.35) !important;
      box-shadow: 0 0 14px rgba(180,130,20,0.14) !important;
      background: rgba(18,10,2,0.96) !important;
    }
    [data-theme="golden"] .rpg-card:hover {
      border-color: rgba(245,195,80,0.6) !important;
      box-shadow: 0 0 30px rgba(212,168,67,0.3) !important;
    }
  `,
  fire: `
    [data-theme="fire"] .rpg-card {
      border-color: rgba(220,80,20,0.35) !important;
      box-shadow: 0 0 12px rgba(200,50,0,0.1) !important;
      background: rgba(14,4,2,0.96) !important;
    }
    [data-theme="fire"] .rpg-card:hover {
      border-color: rgba(255,120,30,0.55) !important;
      box-shadow: 0 0 28px rgba(230,80,0,0.25) !important;
    }
  `,
  ocean: `
    [data-theme="ocean"] .rpg-card {
      border-color: rgba(30,120,220,0.3) !important;
      box-shadow: 0 0 12px rgba(10,80,180,0.1) !important;
      background: rgba(0,6,20,0.96) !important;
    }
    [data-theme="ocean"] .rpg-card:hover {
      border-color: rgba(50,160,255,0.5) !important;
      box-shadow: 0 0 28px rgba(30,120,220,0.22) !important;
    }
  `,
  aurora: `
    [data-theme="aurora"] .rpg-card {
      border-color: rgba(0,220,160,0.3) !important;
      box-shadow: 0 0 12px rgba(0,180,120,0.1) !important;
      background: rgba(0,10,8,0.96) !important;
    }
    [data-theme="aurora"] .rpg-card:hover {
      border-color: rgba(0,255,200,0.5) !important;
      box-shadow: 0 0 28px rgba(0,220,160,0.2) !important;
    }
  `,
  sunset: `
    [data-theme="sunset"] .rpg-card {
      border-color: rgba(240,100,30,0.35) !important;
      box-shadow: 0 0 12px rgba(200,60,10,0.1) !important;
      background: rgba(14,5,2,0.96) !important;
    }
    [data-theme="sunset"] .rpg-card:hover {
      border-color: rgba(255,140,60,0.55) !important;
      box-shadow: 0 0 28px rgba(240,100,30,0.22) !important;
    }
  `,
  volcanic: `
    [data-theme="volcanic"] .rpg-card {
      border-color: rgba(200,60,0,0.35) !important;
      box-shadow: 0 0 12px rgba(180,40,0,0.12) !important;
      background: rgba(12,4,2,0.97) !important;
    }
    [data-theme="volcanic"] .rpg-card:hover {
      border-color: rgba(255,90,0,0.5) !important;
      box-shadow: 0 0 30px rgba(220,60,0,0.25) !important;
    }
  `,
  toxic: `
    [data-theme="toxic"] .rpg-card {
      border-color: rgba(120,255,60,0.3) !important;
      box-shadow: 0 0 12px rgba(80,220,30,0.1) !important;
      background: rgba(4,8,0,0.97) !important;
    }
    [data-theme="toxic"] .rpg-card:hover {
      border-color: rgba(160,255,80,0.5) !important;
      box-shadow: 0 0 26px rgba(100,240,40,0.22) !important;
    }
  `,
  vortex: `
    [data-theme="vortex"] .rpg-card {
      border-color: rgba(140,60,255,0.35) !important;
      box-shadow: 0 0 14px rgba(100,20,220,0.14) !important;
      background: rgba(4,0,10,0.97) !important;
    }
    [data-theme="vortex"] .rpg-card:hover {
      border-color: rgba(180,100,255,0.55) !important;
      box-shadow: 0 0 30px rgba(140,60,255,0.28) !important;
    }
  `,
  interstellaire: `
    [data-theme="interstellaire"] .rpg-card {
      border-color: rgba(100,130,255,0.28) !important;
      box-shadow: 0 0 16px rgba(60,80,220,0.12) !important;
      background: rgba(2,2,8,0.98) !important;
    }
    [data-theme="interstellaire"] .rpg-card:hover {
      border-color: rgba(140,170,255,0.45) !important;
      box-shadow: 0 0 32px rgba(100,130,255,0.22) !important;
    }
  `,
  neant: `
    [data-theme="neant"] .rpg-card {
      border-color: rgba(60,60,60,0.4) !important;
      background: rgba(4,4,4,0.98) !important;
      box-shadow: none !important;
    }
    [data-theme="neant"] .rpg-card:hover {
      border-color: rgba(120,120,120,0.35) !important;
      box-shadow: 0 0 20px rgba(80,80,80,0.15) !important;
    }
  `,
  abyss: `
    [data-theme="abyss"] .rpg-card {
      border-color: rgba(0,80,140,0.3) !important;
      box-shadow: 0 0 12px rgba(0,60,120,0.1) !important;
      background: rgba(2,8,14,0.97) !important;
    }
    [data-theme="abyss"] .rpg-card:hover {
      border-color: rgba(0,120,200,0.45) !important;
      box-shadow: 0 0 26px rgba(0,100,180,0.2) !important;
    }
  `,
}

// ── Ambient overlay components ─────────────────────────────────

function AuroraOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: `${30 + i * 18}%`,
          left: '-60%',
          width: '220%',
          height: `${60 + i * 20}px`,
          background: i === 0
            ? 'linear-gradient(90deg, transparent, rgba(0,255,180,0.08), rgba(0,200,255,0.12), transparent)'
            : i === 1
            ? 'linear-gradient(90deg, transparent, rgba(100,255,200,0.06), rgba(0,180,255,0.08), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,255,150,0.05), rgba(80,200,255,0.07), transparent)',
          animation: `aurora-wave ${7 + i * 3}s ease-in-out infinite`,
          animationDelay: `${i * 2.5}s`,
          borderRadius: '50%',
        }} />
      ))}
    </div>
  )
}

function MatrixOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,70,0.022) 3px, rgba(0,255,70,0.022) 4px)',
        backgroundSize: '100% 4px',
      }} />
      {/* Moving scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent, rgba(0,255,70,0.15), rgba(0,255,70,0.35), rgba(0,255,70,0.15), transparent)',
        animation: 'matrix-scan 5s linear infinite',
        top: 0,
      }} />
    </div>
  )
}

interface Particle { id: number; x: number; delay: number; duration: number; drift: number; size: number }
function useParticles(count: number): Particle[] {
  const ref = useRef<Particle[]>([])
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 120,
      size: 2 + Math.random() * 3,
    }))
  }
  return ref.current
}

function EmberOverlay() {
  const embers = useParticles(22)
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {embers.map(e => (
        <div key={e.id} style={{
          position: 'absolute',
          bottom: '-10px',
          left: `${e.x}%`,
          width: `${e.size}px`,
          height: `${e.size * 1.6}px`,
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          background: e.size > 4 ? 'rgba(255,120,20,0.85)' : 'rgba(255,200,60,0.9)',
          boxShadow: `0 0 ${e.size * 2}px rgba(255,100,10,0.6)`,
          animation: `ember-rise ${e.duration}s ease-out infinite`,
          animationDelay: `${e.delay}s`,
          '--drift': `${e.drift}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

function BubbleOverlay() {
  const bubbles = useParticles(16)
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {bubbles.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          bottom: '-20px',
          left: `${b.x}%`,
          width: `${b.size * 3}px`,
          height: `${b.size * 3}px`,
          borderRadius: '50%',
          border: `1px solid rgba(30,160,255,0.4)`,
          background: 'rgba(10,120,220,0.06)',
          animation: `bubble-rise ${b.duration + 3}s ease-in infinite`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}
    </div>
  )
}

function StarField({ count = 80, color = 'rgba(200,210,255,0.7)' }: { count?: number; color?: string }) {
  const stars = useParticles(count)
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          top: `${s.x}%`,
          left: `${(s.drift + 100) * 0.5}%`,
          width: `${s.size * 0.7}px`,
          height: `${s.size * 0.7}px`,
          borderRadius: '50%',
          background: color,
          '--base-opacity': 0.3 + Math.random() * 0.5,
          animation: `star-twinkle ${2 + s.delay * 0.5}s ease-in-out infinite`,
          animationDelay: `${s.delay * 0.4}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

function VortexOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {[180, 280, 380, 500, 640].map((size, i) => (
        <div key={size} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: `${size}px`, height: `${size}px`,
          border: `1px solid rgba(${140 - i * 15},${60 + i * 10},255,${0.18 - i * 0.025})`,
          borderRadius: '50%',
          animation: `vortex-spin ${8 + i * 4}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
          boxShadow: `inset 0 0 ${10 + i * 4}px rgba(120,40,255,0.06)`,
        }} />
      ))}
    </div>
  )
}

function NeantOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '40vw', height: '40vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,20,20,0.6) 0%, transparent 70%)',
        animation: 'neant-breathe 6s ease-in-out infinite',
        filter: 'blur(40px)',
      }} />
    </div>
  )
}

function HoloOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: `${-10 + i * 35}%`,
          left: '-30%',
          width: '160%',
          height: `${80 + i * 30}px`,
          background: i === 0
            ? 'linear-gradient(90deg, transparent, rgba(255,100,100,0.04), rgba(0,200,255,0.06), transparent)'
            : i === 1
            ? 'linear-gradient(90deg, transparent, rgba(100,255,100,0.04), rgba(255,150,0,0.05), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(150,50,255,0.04), rgba(255,0,150,0.05), transparent)',
          animation: `aurora-wave ${9 + i * 4}s ease-in-out infinite`,
          animationDelay: `${i * 3}s`,
          borderRadius: '50%',
        }} />
      ))}
    </div>
  )
}

function NeonGridOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,0,230,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
    </div>
  )
}

function ThemeOverlay({ theme }: { theme: string }) {
  switch (theme) {
    case 'aurora':         return <AuroraOverlay />
    case 'volcanic':       return <EmberOverlay />
    case 'fire':           return <EmberOverlay />
    case 'ocean':          return <BubbleOverlay />
    case 'matrix':         return <MatrixOverlay />
    case 'neon':           return <NeonGridOverlay />
    case 'holographic':    return <HoloOverlay />
    case 'vortex':         return <VortexOverlay />
    case 'neant':          return <NeantOverlay />
    case 'interstellaire': return <StarField count={120} color="rgba(200,210,255,0.8)" />
    case 'galaxy':         return <StarField count={60} color="rgba(180,150,255,0.6)" />
    case 'astral':         return <StarField count={50} color="rgba(200,180,255,0.65)" />
    case 'cosmic':         return <StarField count={40} color="rgba(130,160,255,0.55)" />
    case 'abyss':          return <StarField count={30} color="rgba(80,160,220,0.5)" />
    default:               return null
  }
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
  const theme = bgTheme ?? 'galaxy'
  const bg = THEME_BG[theme] ?? '#080A12'
  const css = THEME_CSS[theme] ?? ''

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col"
      style={{ background: bg, transition: 'background 0.8s ease', position: 'relative' }}
    >
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <ThemeOverlay theme={theme} />
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
      <BugReportFab />
    </div>
  )
}
