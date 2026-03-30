'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, Gamepad2, TrendingUp, Clock, UserCheck, UserX, Mail } from 'lucide-react'

interface Stats {
  total_users: number
  active_users: number
  pending_invitations: number
  suspended_users: number
  banned_users: number
  expired_users: number
  sessions_today: number
  new_users_this_week: number
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rpg-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-white text-2xl font-bold font-cinzel">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        // API returns { stats: { users, pending, active } } — adapt
        if (d.stats) {
          setStats({
            total_users: d.stats.users ?? 0,
            active_users: d.stats.active ?? 0,
            pending_invitations: d.stats.pending ?? 0,
            suspended_users: d.stats.suspended ?? 0,
            banned_users: d.stats.banned ?? 0,
            expired_users: d.stats.expired ?? 0,
            sessions_today: d.stats.sessions_today ?? 0,
            new_users_this_week: d.stats.new_this_week ?? 0,
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm animate-pulse">Chargement...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="rpg-card p-8 text-center">
          <p className="text-gray-400">Impossible de charger les statistiques.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 size={24} className="text-[#FF4D6A]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm">Vue d'ensemble de la plateforme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={20} />} label="Utilisateurs" value={stats.total_users} color="#4D8BFF" />
        <StatCard icon={<UserCheck size={20} />} label="Actifs" value={stats.active_users} color="#25C292" />
        <StatCard icon={<Gamepad2 size={20} />} label="Parties aujourd'hui" value={stats.sessions_today} color="#D4A843" />
        <StatCard icon={<TrendingUp size={20} />} label="Nouveaux (7j)" value={stats.new_users_this_week} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Mail size={20} />} label="Invitations en attente" value={stats.pending_invitations} color="#4D8BFF" />
        <StatCard icon={<Clock size={20} />} label="Suspendus" value={stats.suspended_users} color="#F59E0B" />
        <StatCard icon={<UserX size={20} />} label="Bannis" value={stats.banned_users} color="#FF4D6A" />
      </div>

      <div className="mt-8 rpg-card p-6">
        <h2 className="font-cinzel font-bold text-white mb-4">Graphiques détaillés</h2>
        <p className="text-gray-500 text-sm text-center py-8">
          Graphiques d'activité à venir — Phase 6
        </p>
      </div>
    </div>
  )
}
