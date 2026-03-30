'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  icon: string
  children: React.ReactNode
  branchColor?: string
}

export default function GameShell({ title, icon, children, branchColor = '#D4A843' }: Props) {
  const router = useRouter()
  return (
    <div className="min-h-full p-4 md:p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-2xl">{icon}</span>
        <h1 className="font-cinzel text-xl font-bold text-white tracking-wide">{title}</h1>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
