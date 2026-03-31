'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, Gamepad2, TrendingUp, Clock, UserCheck, UserX, Mail, Trophy, Swords } from 'lucide-react'

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

interface SessionRow {
  id: string
  game_type: string
  score: number
  xp_earned: number
  questions_total: number
  questions_correct: number
  started_at: string
  users: { full_name: string } | null
  modules: { title: string } | null
}

interface PlayerRow {
  xp: number
  level: number
  class_name: string
  users: { full_name: string } | null
}

interface AnalyticsData {
  recent_sessions: SessionRow[]
  top_players: PlayerRow[]
  daily_sessions: { date: string; count: number }[]
  top_modules: { title: string; count: number }[]
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  return `il y a ${Math.floor(hrs / 24)}j`
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

const GAME_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  platformer: 'Plateforme',
  dungeon: 'Donjon',
}

const CLASS_COLORS: Record<string, string> = {
  Recrue: '#9ca3af',
  Éclaireur: '#60a5fa',
  Guerrier: '#34d399',
  Champion: '#f59e0b',
  Maître: '#a78bfa',
  Légende: '#f97316',
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/analytics').then(r => r.json()),
    ]).then(([d, a]) => {
      if (d.stats) {
        setStats({
          total_users:        d.stats.users         ?? 0,
          active_users:       d.stats.active        ?? 0,
          pending_invitations: d.stats.pending      ?? 0,
          suspended_users:    d.stats.suspended     ?? 0,
          banned_users:       d.stats.banned        ?? 0,
          expired_users:      d.stats.expired       ?? 0,
          sessions_today:     d.stats.sessions_today ?? 0,
          new_users_this_week: d.stats.new_this_week ?? 0,
        })
      }
      if (!a.error) setAnalytics(a as AnalyticsData)
    }).catch(console.error).finally(() => setLoading(false))
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

  const maxDaily = Math.max(1, ...(analytics?.daily_sessions.map(d => d.count) ?? [1]))
  const maxModule = Math.max(1, ...(analytics?.top_modules.map(m => m.count) ?? [1]))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 size={24} className="text-[#FF4D6A]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm">Vue d'ensemble de la plateforme</p>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={<Users size={20} />}     label="Utilisateurs"       value={stats.total_users}         color="#4D8BFF" />
        <StatCard icon={<UserCheck size={20} />} label="Actifs"             value={stats.active_users}        color="#25C292" />
        <StatCard icon={<Gamepad2 size={20} />}  label="Parties aujourd'hui" value={stats.sessions_today}     color="#D4A843" />
        <StatCard icon={<TrendingUp size={20} />} label="Nouveaux (7j)"     value={stats.new_users_this_week} color="#F59E0B" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Mail size={20} />}  label="Invitations en attente" value={stats.pending_invitations} color="#4D8BFF" />
        <StatCard icon={<Clock size={20} />} label="Suspendus"              value={stats.suspended_users}    color="#F59E0B" />
        <StatCard icon={<UserX size={20} />} label="Bannis"                 value={stats.banned_users}       color="#FF4D6A" />
      </div>

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Daily sessions bar chart */}
          <div className="rpg-card p-5">
            <h2 className="font-cinzel font-bold text-white mb-4 flex items-center gap-2">
              <Gamepad2 size={16} className="text-[#D4A843]" />
              Parties — 7 derniers jours
            </h2>
            <div className="flex items-end gap-2 h-32">
              {analytics.daily_sessions.map(({ date, count }) => (
                <div key={date} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-gray-400 text-[10px]">{count || ''}</span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${Math.max(4, (count / maxDaily) * 96)}px`,
                      background: count > 0
                        ? 'linear-gradient(to top, #4D8BFF, #7BB3FF)'
                        : '#1e293b',
                    }}
                  />
                  <span className="text-gray-500 text-[10px] truncate w-full text-center">
                    {shortDate(date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top players */}
          <div className="rpg-card p-5">
            <h2 className="font-cinzel font-bold text-white mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-[#D4A843]" />
              Top Joueurs
            </h2>
            <div className="space-y-2">
              {analytics.top_players.length === 0 && (
                <p className="text-gray-500 text-sm">Aucune donnée.</p>
              )}
              {analytics.top_players.map((p, i) => {
                const classColor = CLASS_COLORS[p.class_name] ?? '#9ca3af'
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-5 text-center text-gray-500 text-xs font-bold">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {p.users?.full_name ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: classColor }}>
                        Niv. {p.level} · {p.class_name}
                      </p>
                    </div>
                    <span className="text-[#D4A843] text-sm font-bold font-cinzel">
                      {p.xp.toLocaleString()} XP
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Module popularity */}
          <div className="rpg-card p-5">
            <h2 className="font-cinzel font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#25C292]" />
              Modules populaires (7j)
            </h2>
            {analytics.top_modules.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune partie jouée cette semaine.</p>
            ) : (
              <div className="space-y-3">
                {analytics.top_modules.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 truncate">{m.title}</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0">{m.count} partie{m.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(m.count / maxModule) * 100}%`,
                          background: 'linear-gradient(to right, #25C292, #4D8BFF)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="rpg-card p-5">
            <h2 className="font-cinzel font-bold text-white mb-4 flex items-center gap-2">
              <Swords size={16} className="text-[#FF4D6A]" />
              Parties récentes
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {analytics.recent_sessions.length === 0 && (
                <p className="text-gray-500 text-sm">Aucune partie enregistrée.</p>
              )}
              {analytics.recent_sessions.map(s => {
                const pct = s.questions_total > 0
                  ? Math.round((s.questions_correct / s.questions_total) * 100)
                  : 0
                const scoreColor = pct >= 70 ? '#25C292' : pct >= 40 ? '#F59E0B' : '#FF4D6A'
                return (
                  <div key={s.id} className="flex items-center gap-3 py-1 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {s.users?.full_name ?? '—'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {GAME_TYPE_LABELS[s.game_type] ?? s.game_type}
                        {s.modules?.title ? ` · ${s.modules.title}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: scoreColor }}>{pct}%</p>
                      <p className="text-gray-500 text-xs">{timeAgo(s.started_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
