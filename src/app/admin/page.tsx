'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldCheck, BookOpen, Users, BarChart3, Settings, Clock, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Stats {
  total_users: number
  active_users: number
  pending_invitations: number
  suspended_users: number
}

export default function AdminPage() {
  const { user } = useAuth()
  const isAdminPlus = user?.role === 'moderator' || user?.role === 'god'
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingQ, setPendingQ] = useState(0)
  const [pendingBranchReq, setPendingBranchReq] = useState(0)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats)
    })
    if (isAdminPlus) {
      fetch('/api/admin/questions?status=pending').then(r => r.json()).then(d => {
        setPendingQ(d.total ?? 0)
      })
      fetch('/api/admin/branch-requests?status=pending').then(r => r.json()).then(d => {
        setPendingBranchReq(d.total ?? 0)
      })
    }
  }, [isAdminPlus])

  const QUICK_LINKS = [
    {
      href: '/admin/questions',
      label: 'Questions',
      description: isAdminPlus ? 'Créer, approuver et gérer les questions' : 'Proposer des questions pour validation',
      icon: <BookOpen size={22} />,
      color: '#D4A843',
      badge: pendingQ > 0 ? `${pendingQ} en attente` : null,
      badgeColor: '#F59E0B',
      show: true,
    },
    {
      href: '/admin/branch-requests',
      label: 'Changements de branche',
      description: 'Approuver ou refuser les demandes des utilisateurs',
      icon: <ArrowRightLeft size={22} />,
      color: '#A78BFA',
      badge: pendingBranchReq > 0 ? `${pendingBranchReq} en attente` : null,
      badgeColor: '#F59E0B',
      show: isAdminPlus,
    },
    {
      href: '/admin/users',
      label: 'Utilisateurs',
      description: 'Gérer les comptes, suspendre, bannir',
      icon: <Users size={22} />,
      color: '#4D8BFF',
      badge: stats ? `${stats.total_users} total` : null,
      badgeColor: '#4D8BFF',
      show: isAdminPlus,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      description: 'Statistiques de la plateforme',
      icon: <BarChart3 size={22} />,
      color: '#25C292',
      badge: stats ? `${stats.active_users} actifs` : null,
      badgeColor: '#25C292',
      show: isAdminPlus,
    },
    {
      href: '/admin/settings',
      label: 'Paramètres',
      description: 'Configuration emails et sécurité',
      icon: <Settings size={22} />,
      color: '#A78BFA',
      badge: null,
      badgeColor: '',
      show: isAdminPlus,
    },
  ].filter(l => l.show)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={24} className="text-[#FF4D6A]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm">
            {isAdminPlus ? 'Gestion complète de la plateforme' : 'Espace modérateur'}
          </p>
        </div>
      </div>

      {/* Stats row */}
      {stats && isAdminPlus && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Utilisateurs', value: stats.total_users, color: '#4D8BFF' },
            { label: 'Actifs',       value: stats.active_users, color: '#25C292' },
            { label: 'Invitations',  value: stats.pending_invitations, color: '#D4A843' },
            { label: 'Suspendus',    value: stats.suspended_users, color: '#FF4D6A' },
          ].map(s => (
            <div key={s.label} className="rpg-card p-4 text-center">
              <p className="font-cinzel text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending questions banner */}
      {pendingQ > 0 && (
        <div className="rpg-card p-4 mb-6 flex items-center gap-3"
          style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <Clock size={18} className="text-[#F59E0B] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[#F59E0B] font-semibold text-sm">{pendingQ} question{pendingQ > 1 ? 's' : ''} en attente d'approbation</p>
            <p className="text-gray-500 text-xs">Des modérateurs ont soumis des questions à valider.</p>
          </div>
          <Link href="/admin/questions?status=pending"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
            Voir
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_LINKS.map(link => (
          <Link key={link.href} href={link.href}
            className="rpg-card p-6 flex items-start gap-4 hover:border-white/15 transition-all group">
            <div className="p-3 rounded-xl flex-shrink-0"
              style={{ background: `${link.color}15`, color: link.color }}>
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-cinzel font-bold text-white group-hover:text-[#D4A843] transition-colors">
                  {link.label}
                </p>
                {link.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${link.badgeColor}15`, color: link.badgeColor }}>
                    {link.badge}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{link.description}</p>
            </div>
            <span className="text-gray-600 group-hover:text-[#D4A843] transition-colors text-lg flex-shrink-0 mt-1">→</span>
          </Link>
        ))}
      </div>

      {/* Mod tip */}
      {!isAdminPlus && (
        <div className="mt-6 rpg-card p-4" style={{ border: '1px solid rgba(212,168,67,0.15)', background: 'rgba(212,168,67,0.03)' }}>
          <p className="text-[#D4A843] text-sm font-semibold mb-1">Mode Modérateur</p>
          <p className="text-gray-500 text-xs leading-relaxed">
            En tant que modérateur, tu peux créer et approuver des questions, gérer les utilisateurs et les demandes de branche.
          </p>
        </div>
      )}
    </div>
  )
}
