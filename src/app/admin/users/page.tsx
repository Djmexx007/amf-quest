'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, Shield, Ban, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  status: string
  account_type: string
  selected_branch_id: string | null
  last_login_at: string | null
  created_at: string
  login_count: number
}

const STATUS_COLORS: Record<string, string> = {
  active: '#25C292',
  suspended: '#F59E0B',
  banned: '#FF4D6A',
  pending: '#4D8BFF',
  expired: '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  banned: 'Banni',
  pending: 'En attente',
  expired: 'Expiré',
}

const ROLE_COLORS: Record<string, string> = {
  god: '#D4A843',
  admin: '#FF4D6A',
  moderator: '#F59E0B',
  user: '#4D8BFF',
}

export default function AdminUsersPage() {
  const { addToast } = useUIStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (res.ok) { setUsers(data.users); setTotal(data.total) }
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [page, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleAction(userId: string, action: string, reason?: string) {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action, reason }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: 'Utilisateur mis à jour.' })
      fetchUsers()
    } catch {
      addToast({ type: 'error', title: 'Erreur serveur.' })
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-[#FF4D6A]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-400 text-sm">{total} utilisateurs au total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher..."
            className="w-full bg-[#0D1221] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-[#0D1221] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#D4A843]/50"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button onClick={fetchUsers} className="p-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="rpg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500 text-sm animate-pulse">Chargement...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-500 text-sm">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium">Utilisateur</th>
                <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium hidden sm:table-cell">Rôle</th>
                <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium">Statut</th>
                <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Connexions</th>
                <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium hidden xl:table-cell">Inscrit le</th>
                <th className="text-right px-5 py-3 text-gray-500 text-xs uppercase tracking-wider font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-white text-sm font-medium">{u.full_name}</p>
                      <p className="text-gray-500 text-xs truncate max-w-48">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase"
                      style={{ color: ROLE_COLORS[u.role] ?? '#6B7280', background: `${ROLE_COLORS[u.role] ?? '#6B7280'}15` }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ color: STATUS_COLORS[u.status] ?? '#6B7280', background: `${STATUS_COLORS[u.status] ?? '#6B7280'}15` }}>
                      {STATUS_LABELS[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-gray-400 text-sm">{u.login_count}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <span className="text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('fr-CA')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {actionLoading === u.id ? (
                        <div className="text-gray-500 text-xs animate-pulse">...</div>
                      ) : (
                        <>
                          {u.status === 'active' && (
                            <button
                              onClick={() => handleAction(u.id, 'suspend')}
                              title="Suspendre"
                              className="p-1.5 rounded text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          {(u.status === 'suspended') && (
                            <button
                              onClick={() => handleAction(u.id, 'unsuspend')}
                              title="Réactiver"
                              className="p-1.5 rounded text-green-500 hover:bg-green-500/10 transition-colors"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {u.status !== 'banned' && u.role !== 'god' && (
                            <button
                              onClick={() => handleAction(u.id, 'ban')}
                              title="Bannir"
                              className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {u.status === 'banned' && (
                            <button
                              onClick={() => handleAction(u.id, 'unban')}
                              title="Débannir"
                              className="p-1.5 rounded text-green-500 hover:bg-green-500/10 transition-colors"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500 text-sm">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
