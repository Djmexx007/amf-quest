'use client'

import { useUIStore } from '@/stores/uiStore'

const THEME_BG: Record<string, string> = {
  galaxy: 'linear-gradient(135deg, #0D0625, #1A0840, #0D0625)',
  abyss:  'linear-gradient(135deg, #020B18, #051828, #020B18)',
  golden: 'linear-gradient(135deg, #1A0F00, #2A1800, #1A0F00)',
  fire:   'linear-gradient(135deg, #1A0500, #2A0800, #1A0500)',
  cosmic: 'linear-gradient(135deg, #050515, #0A0830, #050515)',
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
