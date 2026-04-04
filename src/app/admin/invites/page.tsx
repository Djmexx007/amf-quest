'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Plus, Copy, X, Clock, CheckCircle2, XCircle, UserPlus } from 'lucide-react'

interface Invite {
  id: string
  email: string
  full_name: string | null
  role: string
  account_type: string
  account_duration_days: number | null
  status: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  inviter_name: string | null
  invite_url: string
}

interface Stats { total: number; pending: number; accepted: number; expired: number }

const ROLE_COLOR: Record<string, string> = {
  user: '#4D8BFF', moderator: '#F59E0B', god: '#D4A843',
}
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending:   { color: '#F59E0B', icon: <Clock size={12} />,        label: 'En attente' },
  accepted:  { color: '#25C292', icon: <CheckCircle2 size={12} />, label: 'Acceptée' },
  expired:   { color: '#6B7280', icon: <XCircle size={12} />,      label: 'Expirée' },
  cancelled: { color: '#FF4D6A', icon: <XCircle size={12} />,      label: 'Annulée' },
}

export default function InvitesPage() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<Invite[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const isGod = user?.role === 'god'

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async (status = statusFilter) => {
    setLoading(true)
    const res = await fetch(`/api/admin/invites?status=${status}&limit=100`)
    const data = await res.json()
    setInvites(data.invites ?? [])
    setStats(data.stats ?? null)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load(statusFilter) }, [statusFilter, load])

  async function cancelInvite(id: string) {
    setCancelling(id)
    const res = await fetch('/api/admin/invites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' } : i))
      showToast('Invitation annulée.', true)
    } else {
      showToast('Erreur lors de l\'annulation.', false)
    }
    setCancelling(null)
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    showToast('Lien copié !', true)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-xl font-bold text-white">Invitations</h1>
            <p className="text-gray-500 text-sm">Gérer les invitations envoyées</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }}
        >
          <Plus size={16} /> Nouvelle invitation
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',       value: stats.total,    color: '#9CA3AF' },
            { label: 'En attente',  value: stats.pending,  color: '#F59E0B' },
            { label: 'Acceptées',   value: stats.accepted, color: '#25C292' },
            { label: 'Expirées',    value: stats.expired,  color: '#6B7280' },
          ].map(s => (
            <div key={s.label} className="rpg-card p-4 text-center">
              <p className="text-2xl font-bold font-cinzel" style={{ color: s.color }}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['all', 'pending', 'accepted', 'expired', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
            style={{
              background: statusFilter === s ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${statusFilter === s ? '#D4A843' : 'rgba(255,255,255,0.08)'}`,
              color: statusFilter === s ? '#D4A843' : '#6B7280',
            }}>
            {s === 'all' ? 'Toutes' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="rpg-card h-16 animate-pulse" />)}
        </div>
      ) : invites.length === 0 ? (
        <div className="rpg-card p-12 text-center">
          <UserPlus size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">Aucune invitation dans cette catégorie.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-sm text-[#D4A843] hover:underline">
            Créer la première invitation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map(inv => {
            const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.expired
            const rc = ROLE_COLOR[inv.role] ?? '#9CA3AF'
            const expired = new Date(inv.expires_at) < new Date()
            return (
              <div key={inv.id} className="rpg-card px-5 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${rc}20`, color: rc, border: `1px solid ${rc}30` }}>
                  {(inv.full_name ?? inv.email).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-semibold">{inv.full_name ?? inv.email}</p>
                    {inv.full_name && <p className="text-gray-500 text-xs">{inv.email}</p>}
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase"
                      style={{ background: `${rc}15`, color: rc }}>
                      {inv.role}
                    </span>
                    {inv.account_type === 'temporary' && inv.account_duration_days && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>
                        {inv.account_duration_days}j
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: sc.color }}>
                      {sc.icon} {sc.label}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {inv.inviter_name && `Par ${inv.inviter_name} · `}
                      {new Date(inv.created_at).toLocaleDateString('fr-CA')}
                    </span>
                    {inv.status === 'pending' && (
                      <span className="text-xs" style={{ color: expired ? '#FF4D6A' : '#6B7280' }}>
                        Expire le {new Date(inv.expires_at).toLocaleDateString('fr-CA')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inv.status === 'pending' && (
                    <>
                      <button onClick={() => copyUrl(inv.invite_url)}
                        className="p-1.5 rounded-lg transition-all hover:bg-white/5 text-gray-400 hover:text-white"
                        title="Copier le lien">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => cancelInvite(inv.id)}
                        disabled={cancelling === inv.id}
                        className="p-1.5 rounded-lg transition-all hover:bg-red-500/10 text-gray-600 hover:text-red-400 disabled:opacity-40"
                        title="Annuler">
                        <X size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <CreateInviteModal
          isGod={isGod}
          onClose={() => setShowForm(false)}
          onCreated={(inv) => {
            setInvites(prev => [inv, ...prev])
            showToast('Invitation créée !', true)
            setShowForm(false)
          }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50"
          style={{
            background: toast.ok ? 'rgba(37,194,146,0.15)' : 'rgba(255,77,106,0.15)',
            border: `1px solid ${toast.ok ? 'rgba(37,194,146,0.3)' : 'rgba(255,77,106,0.3)'}`,
            color: toast.ok ? '#25C292' : '#FF4D6A',
          }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}

function CreateInviteModal({ isGod, onClose, onCreated, showToast }: {
  isGod: boolean
  onClose: () => void
  onCreated: (inv: Invite) => void
  showToast: (msg: string, ok: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [accountType, setAccountType] = useState('permanent')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ invite_url: string } | null>(null)

  async function submit() {
    if (!email.trim()) { setError('Email requis.'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/invite/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(), full_name: fullName.trim() || undefined,
        role, account_type: accountType,
        account_duration_days: accountType === 'temporary' ? duration : undefined,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erreur.'); return }
    setCreated({ invite_url: data.invite_url })
    onCreated({ ...data.invite, inviter_name: null, invite_url: data.invite_url })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.1)' }}>
        {created ? (
          <div className="text-center">
            <div className="text-5xl mb-3">✉️</div>
            <h3 className="font-cinzel font-bold text-white text-lg mb-2">Invitation créée !</h3>
            <p className="text-gray-400 text-sm mb-4">Partage ce lien avec la personne invitée :</p>
            <div className="flex gap-2">
              <input readOnly value={created.invite_url}
                className="flex-1 bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-gray-400 text-xs" />
              <button onClick={() => { navigator.clipboard.writeText(created.invite_url); showToast('Lien copié !', true) }}
                className="px-3 py-2 rounded-lg text-[#D4A843] transition-all hover:bg-[#D4A843]/10"
                style={{ border: '1px solid rgba(212,168,67,0.2)' }}>
                <Copy size={14} />
              </button>
            </div>
            <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-cinzel font-bold text-white text-lg mb-5">Nouvelle invitation</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="user@example.com"
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50" />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Nom complet</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Optionnel"
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Rôle</label>
                  <select value={role} onChange={e => setRole(e.target.value)}
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none">
                    <option value="user">Utilisateur</option>
                    {isGod && <option value="moderator">Modérateur</option>}
                    {isGod && <option value="god">God</option>}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Compte</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value)}
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none">
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporaire</option>
                  </select>
                </div>
              </div>
              {accountType === 'temporary' && (
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">Durée (jours)</label>
                  <input type="number" min={1} max={365} value={duration} onChange={e => setDuration(Number(e.target.value))}
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none" />
                </div>
              )}
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  Annuler
                </button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #D4A84380)', color: '#080A12' }}>
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
