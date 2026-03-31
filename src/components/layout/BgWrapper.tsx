'use client'

import { useUIStore } from '@/stores/uiStore'

const THEME_BG: Record<string, string> = {
  galaxy:  'radial-gradient(ellipse at 20% 50%, #1E0A4A 0%, #0D0625 45%, #080A12 100%)',
  abyss:   'radial-gradient(ellipse at 75% 20%, #041828 0%, #020B18 50%, #010810 100%)',
  golden:  'radial-gradient(ellipse at 50% 80%, #2E1A00 0%, #1A0F00 55%, #0D0700 100%)',
  fire:    'radial-gradient(ellipse at 30% 25%, #380900 0%, #1E0500 55%, #0D0200 100%)',
  cosmic:  'radial-gradient(ellipse at 65% 35%, #0C0935 0%, #060518 55%, #030312 100%)',
  nebula:  'radial-gradient(ellipse at 40% 60%, #2D0835 0%, #160520 50%, #080A12 100%)',
  matrix:  'radial-gradient(ellipse at 50% 50%, #001E00 0%, #000D00 55%, #000800 100%)',
  diamond: 'radial-gradient(ellipse at 60% 35%, #001E30 0%, #000F1C 55%, #000810 100%)',
}

export default function BgWrapper({ children }: { children: React.ReactNode }) {
  const { bgTheme } = useUIStore()
  const bg = bgTheme ? THEME_BG[bgTheme] : '#080A12'
  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, transition: 'background 0.8s ease' }}>
      {children}
    </div>
  )
}
