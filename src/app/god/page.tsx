'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Crown, UserPlus, Users, GitBranch, Activity,
  Copy, Check, ScrollText, Wrench, Plus, ToggleLeft,
  ToggleRight, ChevronLeft, ChevronRight, Trash2,
  AlertTriangle, RefreshCw, X, Gift, Wallet,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import type { Toast } from '@/types'

type AddToast = (toast: Omit<Toast, 'id'>) => void

// ── Types ─────────────────────────────────────────────────────
interface Branch {
  id: string; slug: string; name: string; description: string | null
  color: string; icon: string; exam_provider: string | null
  is_active: boolean; unlock_level: number; order_index: number
}

interface Invite {
  id: string; email: string; role: string; status: string
  created_at: string; token: string
}

interface LogEntry {
  id: string; action: string; admin_name: string
  details: Record<string, unknown>; ip_address: string | null; created_at: string
}

interface BulkUser {
  id: string; email: string; full_name: string; role: string; status: string
}

type Tab = 'overview' | 'branches' | 'logs' | 'tools' | 'config' | 'questions' | 'users'

// ── Helpers ───────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  pending: '#D4A843', accepted: '#25C292', expired: '#6B7280', cancelled: '#FF4D6A',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Main component ────────────────────────────────────────────
export default function GodPage() {
  const { addToast } = useUIStore()
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown size={24} className="text-[#D4A843]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white tracking-wide">GOD Panel</h1>
          <p className="text-gray-400 text-sm">Contrôle absolu du royaume</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#0D1221', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { key: 'overview',   label: 'Vue d\'ensemble', icon: <Activity size={14} /> },
          { key: 'branches',   label: 'Branches',        icon: <GitBranch size={14} /> },
          { key: 'config',     label: 'Config jeux',     icon: <Wrench size={14} /> },
          { key: 'questions',  label: 'Questions',       icon: <ScrollText size={14} /> },
          { key: 'logs',       label: 'Logs',            icon: <ScrollText size={14} /> },
          { key: 'users',      label: 'Utilisateurs',    icon: <Users size={14} /> },
          { key: 'tools',      label: 'Dev',             icon: <Wrench size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.25)' }
              : { color: '#6B7280' }}
          >
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'users'     && <UsersHubTab addToast={addToast} />}
      {tab === 'overview'  && <OverviewTab addToast={addToast} />}
      {tab === 'branches'  && <BranchesTab addToast={addToast} />}
      {tab === 'config'    && <GameConfigTab addToast={addToast} />}
      {tab === 'questions' && <QuestionsApprovalTab addToast={addToast} />}
      {tab === 'logs'      && <LogsTab />}
      {tab === 'tools'     && <ToolsTab addToast={addToast} />}
    </div>
  )
}

// ── Tab: Vue d'ensemble ───────────────────────────────────────
function OverviewTab({ addToast }: { addToast: AddToast }) {
  const [branches, setBranches]     = useState<Branch[]>([])
  const [recentInvites, setRecentInvites] = useState<Invite[]>([])
  const [stats, setStats]           = useState({ users: 0, pending: 0, active: 0 })
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '', full_name: '', role: 'user', account_type: 'permanent',
    account_duration_days: 30, suggested_branch_id: '',
  })
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [inviteError, setInviteError]   = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const refresh = useCallback(() => {
    fetch('/api/god/branches').then(r => r.json()).then(d => setBranches((d.branches ?? []).filter((b: Branch) => b.is_active)))
    fetch('/api/admin/stats').then(r => r.json()).then(d => { if (d.stats) setStats(d.stats) })
    fetch('/api/admin/invites?limit=10').then(r => r.json()).then(d => setRecentInvites(d.invites ?? []))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(''); setInviteResult(null); setInviteLoading(true)
    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          suggested_branch_id: form.suggested_branch_id || undefined,
          account_duration_days: form.account_type === 'temporary' ? form.account_duration_days : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Erreur inconnue.') }
      else {
        setInviteResult({ url: data.invite_url })
        setForm({ email: '', full_name: '', role: 'user', account_type: 'permanent', account_duration_days: 30, suggested_branch_id: '' })
        refresh()
        addToast({ type: 'success', title: 'Invitation créée !' })
      }
    } catch { setInviteError('Impossible de contacter le serveur.') }
    finally { setInviteLoading(false) }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Utilisateurs total', value: stats.users,   icon: <Users size={18} />,    color: '#4D8BFF' },
          { label: 'Actifs',             value: stats.active,  icon: <Activity size={18} />, color: '#25C292' },
          { label: 'Invitations en attente', value: stats.pending, icon: <UserPlus size={18} />, color: '#D4A843' },
        ].map(s => (
          <div key={s.label} className="rpg-card p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-white font-cinzel">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create invitation */}
        <div className="rpg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus size={18} className="text-[#D4A843]" />
            <h2 className="font-cinzel font-bold text-white">Créer une invitation</h2>
          </div>

          {inviteResult && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(37,194,146,0.08)', border: '1px solid rgba(37,194,146,0.25)' }}>
              <p className="text-[#25C292] text-sm font-semibold mb-2">✓ Invitation créée !</p>
              <p className="text-gray-300 text-xs break-all mb-2">{inviteResult.url}</p>
              <button onClick={() => copy(inviteResult.url, 'result')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ background: '#25C29220', color: '#25C292', border: '1px solid #25C29240' }}>
                {copiedId === 'result' ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === 'result' ? 'Copié !' : 'Copier le lien'}
              </button>
            </div>
          )}
          {inviteError && (
            <div className="mb-4 p-3 rounded-lg text-red-400 text-sm" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.25)' }}>
              {inviteError}
            </div>
          )}

          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                  placeholder="email@exemple.com" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Nom complet</label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                  placeholder="Marie Tremblay" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors">
                  <option value="user">Utilisateur</option>
                  <option value="moderator">Modérateur</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Type de compte</label>
                <select value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors">
                  <option value="permanent">Permanent</option>
                  <option value="temporary">Temporaire</option>
                </select>
              </div>
            </div>

            {form.account_type === 'temporary' && (
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Durée (jours)</label>
                <select value={form.account_duration_days} onChange={e => setForm(f => ({ ...f, account_duration_days: Number(e.target.value) }))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors">
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} jours</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">
                Branche suggérée <span className="normal-case text-gray-600">(optionnel)</span>
              </label>
              <select value={form.suggested_branch_id} onChange={e => setForm(f => ({ ...f, suggested_branch_id: e.target.value }))}
                className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors">
                <option value="">Laisser l'utilisateur choisir</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </select>
            </div>

            <button type="submit" disabled={inviteLoading}
              className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12', boxShadow: '0 0 20px rgba(212,168,67,0.3)' }}>
              {inviteLoading ? 'Création...' : "Générer le lien d'invitation"}
            </button>
          </form>
        </div>

        {/* Recent invitations */}
        <div className="rpg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-[#D4A843]" />
            <h2 className="font-cinzel font-bold text-white">Invitations récentes</h2>
          </div>
          {recentInvites.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucune invitation créée.</p>
          ) : (
            <div className="space-y-2">
              {recentInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 capitalize">{invite.role}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs font-semibold capitalize" style={{ color: STATUS_COLOR[invite.status] ?? '#6B7280' }}>{invite.status}</span>
                    </div>
                  </div>
                  {invite.status === 'pending' && (
                    <button onClick={() => copy(inviteUrl(invite.token), invite.id)}
                      className="ml-3 flex-shrink-0 p-1.5 rounded text-gray-500 hover:text-[#D4A843] transition-colors" title="Copier le lien">
                      {copiedId === invite.id ? <Check size={14} className="text-[#25C292]" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Branches ─────────────────────────────────────────────
function BranchesTab({ addToast }: { addToast: AddToast }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Branch | null>(null)
  const [form, setForm] = useState({ slug: '', name: '', description: '', color: '#25C292', icon: '⚡', exam_provider: '', unlock_level: 1 })
  const [saving, setSaving]    = useState(false)

  const fetchBranches = useCallback(() => {
    setLoading(true)
    fetch('/api/god/branches').then(r => r.json())
      .then(d => setBranches(d.branches ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])

  function openCreate() {
    setEditTarget(null)
    setForm({ slug: '', name: '', description: '', color: '#25C292', icon: '⚡', exam_provider: '', unlock_level: 1 })
    setShowForm(true)
  }

  function openEdit(b: Branch) {
    setEditTarget(b)
    setForm({ slug: b.slug, name: b.name, description: b.description ?? '', color: b.color, icon: b.icon, exam_provider: b.exam_provider ?? '', unlock_level: b.unlock_level })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        const res = await fetch('/api/god/branches', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editTarget.id, ...form }),
        })
        const data = await res.json()
        if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
        addToast({ type: 'success', title: 'Branche mise à jour.' })
      } else {
        const res = await fetch('/api/god/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
        addToast({ type: 'success', title: 'Branche créée !' })
      }
      setShowForm(false)
      fetchBranches()
    } catch { addToast({ type: 'error', title: 'Erreur serveur.' }) }
    finally { setSaving(false) }
  }

  async function toggleActive(b: Branch) {
    const res = await fetch('/api/god/branches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, is_active: !b.is_active }),
    })
    if (res.ok) {
      addToast({ type: 'success', title: b.is_active ? 'Branche désactivée.' : 'Branche activée.' })
      fetchBranches()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{branches.length} branche(s) configurée(s)</p>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }}>
          <Plus size={14} /> Nouvelle branche
        </button>
      </div>

      {loading ? (
        <div className="rpg-card p-10 text-center text-gray-500 text-sm animate-pulse">Chargement...</div>
      ) : (
        <div className="space-y-3">
          {branches.map(b => (
            <div key={b.id} className="rpg-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${b.color}15`, border: `1px solid ${b.color}30` }}>
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-cinzel font-bold text-white">{b.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: `${b.color}10`, color: b.color }}>{b.slug}</span>
                  {!b.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#6B7280' }}>inactif</span>
                  )}
                </div>
                {b.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{b.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  {b.exam_provider && <span className="text-gray-600 text-xs">{b.exam_provider}</span>}
                  <span className="text-gray-600 text-xs">Niv. déverrouillage : {b.unlock_level}</span>
                  <span className="text-gray-600 text-xs">Ordre : {b.order_index}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(b)}
                  className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10">
                  Modifier
                </button>
                <button onClick={() => toggleActive(b)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: b.is_active ? '#25C292' : '#6B7280' }}
                  title={b.is_active ? 'Désactiver' : 'Activer'}>
                  {b.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="rpg-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h3 className="font-cinzel font-bold text-white">
                  {editTarget ? 'Modifier la branche' : 'Nouvelle branche'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Slug *</label>
                    <input type="text" required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                      disabled={!!editTarget}
                      className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 disabled:opacity-40"
                      placeholder="assurance" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Nom *</label>
                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
                      placeholder="Assurance" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Description</label>
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
                    placeholder="Examen AMF Assurance de personnes" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Couleur *</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer border border-white/10 bg-transparent" />
                      <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        className="flex-1 bg-[#080A12] border border-white/10 rounded-lg px-2 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4A843]/50 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Icône *</label>
                    <input type="text" required value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                      className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-center text-2xl focus:outline-none focus:border-[#D4A843]/50"
                      maxLength={2} placeholder="🛡️" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Niv. unlock</label>
                    <input type="number" min={1} max={50} value={form.unlock_level} onChange={e => setForm(f => ({ ...f, unlock_level: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Organisme examinateur</label>
                  <input type="text" value={form.exam_provider} onChange={e => setForm(f => ({ ...f, exam_provider: e.target.value }))}
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
                    placeholder="AMF, CSI, IQPF..." />
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: `${form.color}08`, border: `1px solid ${form.color}25` }}>
                  <span className="text-2xl">{form.icon}</span>
                  <div>
                    <p className="font-cinzel font-bold text-sm" style={{ color: form.color }}>{form.name || 'Aperçu'}</p>
                    <p className="text-gray-500 text-xs font-mono">{form.slug || 'slug'}</p>
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
                  {saving ? 'Enregistrement...' : editTarget ? 'Mettre à jour' : 'Créer la branche'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Logs système ─────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs]   = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage]   = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback((p: number) => {
    setLoading(true)
    fetch(`/api/god/logs?page=${p}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLogs(page) }, [page, fetchLogs])

  const totalPages = Math.ceil(total / 25)

  const ACTION_COLOR: Record<string, string> = {
    login: '#25C292',
    logout: '#6B7280',
    invite_created: '#D4A843',
    purge_expired_invitations: '#F59E0B',
    expire_stale_accounts: '#F59E0B',
    bulk_delete_users: '#FF4D6A',
    suspend_user: '#FF4D6A',
    ban_user: '#FF4D6A',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{total} entrée(s) au total</p>
        <button onClick={() => fetchLogs(page)}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="rpg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm animate-pulse">Chargement...</div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">Aucun log disponible.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded font-mono"
                    style={{ background: `${ACTION_COLOR[log.action] ?? '#6B7280'}15`, color: ACTION_COLOR[log.action] ?? '#6B7280' }}>
                    {log.action}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-xs">Par <span className="text-white font-medium">{log.admin_name}</span>
                    {log.ip_address && <span className="text-gray-600"> · {log.ip_address}</span>}
                  </p>
                  {Object.keys(log.details).length > 0 && (
                    <p className="text-gray-600 text-xs font-mono mt-0.5 truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-gray-600 text-xs whitespace-nowrap">
                  {formatDate(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Config jeux ─────────────────────────────────────────
function GameConfigTab({ addToast }: { addToast: AddToast }) {
  const [xpMult, setXpMult]       = useState(1.0)
  const [goldMult, setGoldMult]   = useState(1.0)
  const [questionsPerGame, setQPG] = useState(10)
  const [maintenance, setMaintenance] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    fetch('/api/god/config').then(r => r.json()).then(d => {
      if (d.config) {
        setXpMult(d.config.xp_multiplier ?? 1.0)
        setGoldMult(d.config.gold_multiplier ?? 1.0)
        setQPG(d.config.questions_per_game ?? 10)
        setMaintenance(d.config.maintenance_mode ?? false)
      }
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/god/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xp_multiplier: xpMult, gold_multiplier: goldMult, questions_per_game: questionsPerGame, maintenance_mode: maintenance }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
    addToast({ type: 'success', title: 'Configuration mise à jour.' })
  }

  if (loading) return <div className="rpg-card p-10 text-center text-gray-500 animate-pulse">Chargement...</div>

  const MULT_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0]

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* XP Multiplier */}
      <div className="rpg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-cinzel font-bold text-white text-sm">Multiplicateur XP</h3>
            <p className="text-gray-500 text-xs mt-0.5">Multiplie l'XP gagné dans tous les jeux</p>
          </div>
          <span className="font-cinzel text-2xl font-black" style={{ color: '#D4A843' }}>×{xpMult.toFixed(1)}</span>
        </div>
        <input type="range" min="0.1" max="5.0" step="0.1" value={xpMult} onChange={e => setXpMult(parseFloat(e.target.value))}
          className="w-full mb-3 accent-[#D4A843]" />
        <div className="flex gap-2">
          {MULT_PRESETS.map(p => (
            <button type="button" key={p} onClick={() => setXpMult(p)}
              className="flex-1 py-1.5 rounded text-xs font-semibold transition-all"
              style={xpMult === p
                ? { background: 'rgba(212,168,67,0.2)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              ×{p}
            </button>
          ))}
        </div>
      </div>

      {/* Gold Multiplier */}
      <div className="rpg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-cinzel font-bold text-white text-sm">Multiplicateur Coins 🪙</h3>
            <p className="text-gray-500 text-xs mt-0.5">Multiplie les coins gagnés dans tous les jeux</p>
          </div>
          <span className="font-cinzel text-2xl font-black text-[#F59E0B]">×{goldMult.toFixed(1)}</span>
        </div>
        <input type="range" min="0.1" max="5.0" step="0.1" value={goldMult} onChange={e => setGoldMult(parseFloat(e.target.value))}
          className="w-full mb-3 accent-[#F59E0B]" />
        <div className="flex gap-2">
          {MULT_PRESETS.map(p => (
            <button type="button" key={p} onClick={() => setGoldMult(p)}
              className="flex-1 py-1.5 rounded text-xs font-semibold transition-all"
              style={goldMult === p
                ? { background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              ×{p}
            </button>
          ))}
        </div>
      </div>

      {/* Questions per game */}
      <div className="rpg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-cinzel font-bold text-white text-sm">Questions par partie</h3>
            <p className="text-gray-500 text-xs mt-0.5">Nombre de questions dans le Quiz Éclair</p>
          </div>
          <span className="font-cinzel text-2xl font-black text-[#25C292]">{questionsPerGame}</span>
        </div>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map(n => (
            <button type="button" key={n} onClick={() => setQPG(n)}
              className="flex-1 py-1.5 rounded text-xs font-semibold transition-all"
              style={questionsPerGame === n
                ? { background: 'rgba(37,194,146,0.2)', color: '#25C292', border: '1px solid rgba(37,194,146,0.4)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance mode */}
      <div className="rpg-card p-6">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-cinzel font-bold text-white text-sm">Mode maintenance</h3>
            <p className="text-gray-500 text-xs mt-0.5">Bloque l'accès aux utilisateurs non-god</p>
          </div>
          <button type="button" onClick={() => setMaintenance(v => !v)}
            className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: maintenance ? '#FF4D6A' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
              style={{ left: maintenance ? '26px' : '4px' }} />
          </button>
        </label>
      </div>

      {/* Preview */}
      <div className="rpg-card p-5">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Aperçu des récompenses (base)</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Quiz (10/10)', baseXP: 150, baseCoins: 45 },
            { label: 'Quiz (7/10)', baseXP: 100, baseCoins: 30 },
            { label: 'Donjon boss', baseXP: 300, baseCoins: 90 },
          ].map(ex => (
            <div key={ex.label} className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-gray-500 text-xs mb-2">{ex.label}</p>
              <p className="font-cinzel font-bold text-sm" style={{ color: '#D4A843' }}>
                +{Math.round(ex.baseXP * xpMult)} XP
              </p>
              <p className="text-[#F59E0B] text-xs">+{Math.round(ex.baseCoins * goldMult)} 🪙</p>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12', boxShadow: '0 0 20px rgba(212,168,67,0.2)' }}>
        {saving ? 'Enregistrement...' : 'Appliquer la configuration'}
      </button>

      <ChestPricingSection addToast={addToast} />
    </form>
  )
}

// ── Chest Pricing Section ─────────────────────────────────────
function ChestPricingSection({ addToast }: { addToast: AddToast }) {
  const [chests, setChests] = useState<{ id: string; name: string; icon: string; rarity: string; cost_coins: number }[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/god/shop-items?mystery_box=true')
      .then(r => r.json())
      .then(d => {
        const items = d.items ?? []
        setChests(items)
        const init: Record<string, number> = {}
        items.forEach((i: { id: string; cost_coins: number }) => { init[i.id] = i.cost_coins })
        setPrices(init)
      })
      .finally(() => setLoading(false))
  }, [])

  async function savePrice(itemId: string) {
    setSaving(itemId)
    const res = await fetch('/api/god/shop-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, cost_coins: prices[itemId] }),
    })
    setSaving(null)
    if (res.ok) {
      addToast({ type: 'success', title: 'Prix mis à jour en temps réel.' })
    } else {
      const d = await res.json()
      addToast({ type: 'error', title: d.error ?? 'Erreur.' })
    }
  }

  if (loading) return null

  const RC_COLOR: Record<string, string> = { common: '#9CA3AF', rare: '#4D8BFF', epic: '#A78BFA', legendary: '#D4A843' }

  return (
    <div className="rpg-card p-6 mt-2">
      <div className="flex items-center gap-2 mb-4">
        <Gift size={16} className="text-[#D4A843]" />
        <h3 className="font-cinzel font-bold text-white text-sm">Prix des coffres</h3>
        <span className="text-gray-600 text-xs ml-1">(appliqué en temps réel)</span>
      </div>
      {chests.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucun coffre trouvé dans la boutique.</p>
      ) : (
        <div className="space-y-3">
          {chests.map(chest => {
            const color = RC_COLOR[chest.rarity] ?? '#9CA3AF'
            return (
              <div key={chest.id} className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-2xl">{chest.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{chest.name}</p>
                  <span className="text-xs font-semibold" style={{ color }}>{chest.rarity}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Wallet size={13} className="text-yellow-500" />
                  <input
                    type="number"
                    min={0}
                    value={prices[chest.id] ?? chest.cost_coins}
                    onChange={e => setPrices(prev => ({ ...prev, [chest.id]: parseInt(e.target.value) || 0 }))}
                    className="w-24 text-right bg-[#080A12] border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
                  />
                  <button
                    type="button"
                    onClick={() => savePrice(chest.id)}
                    disabled={saving === chest.id}
                    className="px-3 py-1 rounded text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }}>
                    {saving === chest.id ? '...' : 'OK'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Approbation questions ────────────────────────────────
function QuestionsApprovalTab({ addToast }: { addToast: AddToast }) {
  const [questions, setQuestions] = useState<{
    id: string; question_text: string; difficulty: number; is_active: boolean; created_at: string
    branches: { name: string; color: string } | null
    answers: { id: string; answer_text: string; is_correct: boolean }[]
  }[]>([])
  const [filter, setFilter] = useState<'pending' | 'active' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const DIFF_LABEL = ['', 'Débutant', 'Intermédiaire', 'Expert']
  const DIFF_COLOR = ['', '#25C292', '#F59E0B', '#FF4D6A']

  const fetchQ = useCallback((f: typeof filter) => {
    setLoading(true)
    fetch(`/api/admin/questions?status=${f}&page=1`)
      .then(r => r.json())
      .then(d => setQuestions(d.questions ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchQ(filter) }, [filter, fetchQ])

  async function action(id: string, act: 'approve' | 'reject') {
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error }); return }
    addToast({ type: 'success', title: data.message })
    fetchQ(filter)
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['pending', 'active', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filter === f
              ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }
              : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
            }>
            {f === 'pending' ? '⏳ En attente' : f === 'active' ? '✓ Actives' : 'Toutes'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rpg-card p-10 text-center text-gray-500 animate-pulse">Chargement...</div>
      ) : questions.length === 0 ? (
        <div className="rpg-card p-10 text-center">
          <p className="text-gray-500">
            {filter === 'pending' ? 'Aucune question en attente d\'approbation.' : 'Aucune question trouvée.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <div key={q.id} className="rpg-card overflow-hidden">
              <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                <div className="mt-0.5">
                  {q.is_active
                    ? <span className="text-[#25C292] text-xs font-bold">✓</span>
                    : <span className="text-[#F59E0B] text-xs font-bold">⏳</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-snug">{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {q.branches && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${q.branches.color}15`, color: q.branches.color }}>
                        {q.branches.name}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: DIFF_COLOR[q.difficulty] }}>{DIFF_LABEL[q.difficulty]}</span>
                    <span className="text-gray-600 text-xs">{new Date(q.created_at).toLocaleDateString('fr-CA')}</span>
                  </div>
                </div>
                {!q.is_active && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); action(q.id, 'approve') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(37,194,146,0.15)', color: '#25C292', border: '1px solid rgba(37,194,146,0.3)' }}>
                      ✓ Approuver
                    </button>
                    <button onClick={e => { e.stopPropagation(); action(q.id, 'reject') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(255,77,106,0.15)', color: '#FF4D6A', border: '1px solid rgba(255,77,106,0.3)' }}>
                      ✗ Rejeter
                    </button>
                  </div>
                )}
              </div>

              {expandedId === q.id && (
                <div className="px-4 pb-4 border-t border-white/5 animate-slide-up">
                  <div className="space-y-1.5 mt-3">
                    {q.answers.map((a, i) => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                        style={{ background: a.is_correct ? 'rgba(37,194,146,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${a.is_correct ? 'rgba(37,194,146,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                        <span className="text-xs w-4 text-gray-500">{String.fromCharCode(65 + i)}.</span>
                        <span className={a.is_correct ? 'text-[#25C292] font-medium' : 'text-gray-400'}>{a.answer_text}</span>
                        {a.is_correct && <span className="ml-auto text-[#25C292] text-xs">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Outils dev ───────────────────────────────────────────
function ToolsTab({ addToast }: { addToast: AddToast }) {
  const [users, setUsers]         = useState<BulkUser[]>([])
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [confirm, setConfirm]     = useState<null | 'purge_expired_invitations' | 'expire_stale_accounts' | 'bulk_delete_users'>(null)
  const [running, setRunning]     = useState(false)

  async function runTool(action: 'purge_expired_invitations' | 'expire_stale_accounts' | 'bulk_delete_users') {
    setRunning(true)
    try {
      const body: Record<string, unknown> = { action }
      if (action === 'bulk_delete_users') body.user_ids = [...selected]

      const res = await fetch('/api/god/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: `Terminé — ${data.affected ?? 0} élément(s) affecté(s).` })
      setSelected(new Set())
      setConfirm(null)
    } catch { addToast({ type: 'error', title: 'Erreur serveur.' }) }
    finally { setRunning(false) }
  }

  function fetchBannedExpired() {
    setLoadingUsers(true)
    fetch('/api/admin/users?status=banned&page=1')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }

  const ROLE_COLOR: Record<string, string> = { god: '#D4A843', admin: '#FF4D6A', moderator: '#F59E0B', user: '#4D8BFF' }

  return (
    <div className="space-y-4">
      {/* Quick tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            id: 'purge_expired_invitations' as const,
            title: 'Purger les invitations expirées',
            description: 'Supprime toutes les invitations dont la date d\'expiration est passée et qui n\'ont pas été acceptées.',
            icon: <Trash2 size={18} />,
            color: '#F59E0B',
            danger: false,
          },
          {
            id: 'expire_stale_accounts' as const,
            title: 'Expirer les comptes temporaires',
            description: 'Passe au statut "expiré" tous les comptes temporaires dont la date d\'expiration est dépassée.',
            icon: <AlertTriangle size={18} />,
            color: '#FF4D6A',
            danger: false,
          },
        ].map(tool => (
          <div key={tool.id} className="rpg-card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${tool.color}15`, color: tool.color }}>{tool.icon}</div>
              <div>
                <p className="text-white font-semibold text-sm">{tool.title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{tool.description}</p>
              </div>
            </div>
            <button
              onClick={() => setConfirm(tool.id)}
              className="w-full py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: `${tool.color}15`, color: tool.color, border: `1px solid ${tool.color}30` }}>
              Exécuter
            </button>
          </div>
        ))}
      </div>

      {/* Bulk delete */}
      <div className="rpg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <Trash2 size={16} className="text-red-500" /> Suppression en masse
            </p>
            <p className="text-gray-500 text-xs mt-0.5">Charger les comptes bannis pour les supprimer définitivement.</p>
          </div>
          <button onClick={fetchBannedExpired} disabled={loadingUsers}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loadingUsers ? 'animate-spin' : ''} /> Charger bannis
          </button>
        </div>

        {users.length > 0 ? (
          <>
            <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={ev => {
                    const next = new Set(selected)
                    ev.target.checked ? next.add(u.id) : next.delete(u.id)
                    setSelected(next)
                  }} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{u.full_name}</p>
                    <p className="text-gray-500 text-xs truncate">{u.email}</p>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ color: ROLE_COLOR[u.role] ?? '#6B7280', background: `${ROLE_COLOR[u.role] ?? '#6B7280'}15` }}>
                    {u.role}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input type="checkbox"
                  checked={selected.size === users.filter(u => u.role !== 'god').length && users.filter(u => u.role !== 'god').length > 0}
                  onChange={ev => setSelected(ev.target.checked ? new Set(users.filter(u => u.role !== 'god').map(u => u.id)) : new Set())}
                />
                Tout sélectionner
              </label>
              <span className="text-gray-600 text-xs">{selected.size} sélectionné(s)</span>
              <button
                onClick={() => { if (selected.size > 0) setConfirm('bulk_delete_users') }}
                disabled={selected.size === 0}
                className="ml-auto px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30"
                style={{ background: 'rgba(255,77,106,0.15)', color: '#FF4D6A', border: '1px solid rgba(255,77,106,0.3)' }}>
                Supprimer ({selected.size})
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-sm text-center py-6">
            {loadingUsers ? 'Chargement...' : 'Cliquez sur "Charger bannis" pour afficher la liste.'}
          </p>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !running && setConfirm(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm animate-slide-up rpg-card p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
              <h3 className="font-cinzel font-bold text-white">Confirmer l'action</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              {confirm === 'bulk_delete_users'
                ? `Supprimer définitivement ${selected.size} utilisateur(s) ? Cette action est irréversible.`
                : 'Cette opération est irréversible. Continuer ?'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} disabled={running}
                className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button onClick={() => runTool(confirm)} disabled={running}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF4D6A, #CC2240)', color: '#fff' }}>
                {running ? 'Exécution...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: User Management Hub (Users + Récompenses fusionnés) ──

// ── Tab: User Management Hub (Users + Récompenses fusionnés) ──
function UsersHubTab({ addToast }: { addToast: AddToast }) {
  const [users, setUsers]       = useState<BulkUser[]>([])
  const [total, setTotal]       = useState(0)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<BulkUser | null>(null)
  const [newRole, setNewRole]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [confirm, setConfirm]   = useState<'role' | 'reset' | null>(null)

  // Reward (individual)
  const [xp, setXp]           = useState(0)
  const [coins, setCoins]     = useState(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Reward (global / branch)
  const [globalType, setGlobalType]         = useState<'global' | 'branch'>('global')
  const [branches, setBranches]             = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [globalXp, setGlobalXp]             = useState(0)
  const [globalCoins, setGlobalCoins]       = useState(0)
  const [globalMsg, setGlobalMsg]           = useState('')
  const [sendingGlobal, setSendingGlobal]   = useState(false)

  const ROLE_COLOR: Record<string, string> = { god: '#D4A843', moderator: '#F59E0B', user: '#4D8BFF' }
  const ROLE_BG:    Record<string, string> = { god: 'rgba(212,168,67,0.1)', moderator: 'rgba(245,158,11,0.1)', user: 'rgba(77,139,255,0.1)' }

  const fetchUsers = useCallback((q: string) => {
    setLoading(true)
    fetch(`/api/god/users?search=${encodeURIComponent(q)}&page=1`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchUsers('')
    fetch('/api/god/branches').then(r => r.json()).then(d => setBranches(d.branches ?? []))
  }, [fetchUsers])

  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  function handleSearch(val: string) {
    setSearch(val)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => fetchUsers(val), 350))
  }

  async function applyRole() {
    if (!selected || !newRole) return
    setSaving(true)
    try {
      const res = await fetch('/api/god/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role', user_id: selected.id, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: `✅ Rôle de ${selected.full_name} → ${newRole}` })
      setSelected(null); setConfirm(null); fetchUsers(search)
    } finally { setSaving(false) }
  }

  async function resetChar() {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/god/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_character', user_id: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: `🔄 ${selected.full_name} réinitialisé (${data.characters_reset} personnage(s))` })
      setSelected(null); setConfirm(null)
    } finally { setSaving(false) }
  }

  async function sendIndividualReward() {
    if (!selected || (xp === 0 && coins === 0)) {
      addToast({ type: 'error', title: 'Indiquer au moins XP ou coins.' }); return
    }
    setSending(true)
    try {
      const res = await fetch('/api/god/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'individual', user_id: selected.id, xp, coins, message: message.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: `🎁 ${selected.full_name} : +${xp} XP, +${coins} coins` })
      setXp(0); setCoins(0); setMessage('')
    } catch { addToast({ type: 'error', title: 'Erreur serveur.' }) }
    finally { setSending(false) }
  }

  async function sendGlobalReward() {
    if (globalXp === 0 && globalCoins === 0) {
      addToast({ type: 'error', title: 'Indiquer au moins XP ou coins.' }); return
    }
    if (globalType === 'branch' && !selectedBranch) {
      addToast({ type: 'error', title: 'Sélectionner une branche.' }); return
    }
    setSendingGlobal(true)
    try {
      const body: Record<string, unknown> = { type: globalType, xp: globalXp, coins: globalCoins, message: globalMsg.trim() || undefined }
      if (globalType === 'branch') body.branch_id = selectedBranch
      const res = await fetch('/api/god/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: `✅ ${data.affected} personnage(s) récompensé(s) !` })
      setGlobalXp(0); setGlobalCoins(0); setGlobalMsg('')
    } catch { addToast({ type: 'error', title: 'Erreur serveur.' }) }
    finally { setSendingGlobal(false) }
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="flex-1 bg-[#080A12] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50"
        />
        <button onClick={() => fetchUsers(search)}
          className="p-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <p className="text-gray-600 text-xs">{total} utilisateur(s) au total</p>

      {/* User list */}
      <div className="rpg-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm animate-pulse">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map(u => (
              <div key={u.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                style={selected?.id === u.id ? { background: 'rgba(212,168,67,0.04)' } : {}}
                onClick={() => { setSelected(u); setNewRole(u.role); setConfirm(null); setXp(0); setCoins(0); setMessage('') }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: ROLE_BG[u.role] ?? 'rgba(255,255,255,0.05)', color: ROLE_COLOR[u.role] ?? '#6B7280' }}>
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0"
                  style={{ background: ROLE_BG[u.role] ?? 'rgba(255,255,255,0.05)', color: ROLE_COLOR[u.role] ?? '#6B7280' }}>
                  {u.role.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel for selected user */}
      {selected && (
        <div className="rpg-card p-5 space-y-5" style={{ border: '1px solid rgba(212,168,67,0.2)', background: 'rgba(212,168,67,0.02)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: ROLE_BG[selected.role] ?? 'rgba(255,255,255,0.05)', color: ROLE_COLOR[selected.role] ?? '#6B7280' }}>
                {selected.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{selected.full_name}</p>
                <p className="text-gray-500 text-xs">{selected.email}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Change role */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Rôle</p>
            <div className="flex gap-2">
              {(['user', 'moderator', 'god'] as const).map(r => (
                <button key={r} onClick={() => setNewRole(r)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={newRole === r
                    ? { background: ROLE_BG[r], color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}40` }
                    : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            {newRole !== selected.role && (
              confirm === 'role' ? (
                <div className="flex gap-2 mt-2">
                  <button onClick={applyRole} disabled={saving}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 disabled:opacity-50">
                    {saving ? 'Enregistrement...' : '✓ Confirmer'}
                  </button>
                  <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-lg text-xs text-gray-500 border border-white/[0.08]">
                    Annuler
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirm('role')}
                  className="w-full mt-2 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(212,168,67,0.1)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.2)' }}>
                  Appliquer → {newRole}
                </button>
              )
            )}
          </div>

          {/* Reward inline */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Récompenser</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Activity size={10} /> XP</label>
                <input type="number" min="0" max="100000" step="50" value={xp} onChange={e => setXp(Number(e.target.value))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4A843]/50" />
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {[100, 250, 500, 1000].map(v => (
                    <button key={v} onClick={() => setXp(v)} type="button"
                      className="px-2 py-0.5 rounded text-xs transition-all"
                      style={xp === v
                        ? { background: 'rgba(212,168,67,0.2)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Wallet size={10} /> Coins</label>
                <input type="number" min="0" max="100000" step="50" value={coins} onChange={e => setCoins(Number(e.target.value))}
                  className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50" />
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {[50, 100, 250, 500].map(v => (
                    <button key={v} onClick={() => setCoins(v)} type="button"
                      className="px-2 py-0.5 rounded text-xs transition-all"
                      style={coins === v
                        ? { background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input type="text" maxLength={200} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Message personnalisé (optionnel)"
              className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 mb-3" />
            <button onClick={sendIndividualReward} disabled={sending || (xp === 0 && coins === 0)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
              {sending ? 'Envoi...' : `🎁 Envoyer ${xp > 0 ? `+${xp} XP` : ''} ${coins > 0 ? `+${coins} coins` : ''}`}
            </button>
          </div>

          {/* Reset character */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Réinitialisation</p>
            {confirm === 'reset' ? (
              <div className="space-y-2">
                <p className="text-xs text-red-400">⚠️ Supprime XP, coins, streak et succès. Irréversible.</p>
                <div className="flex gap-2">
                  <button onClick={resetChar} disabled={saving}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25 disabled:opacity-50">
                    {saving ? 'Réinitialisation...' : '🔄 Confirmer reset'}
                  </button>
                  <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-lg text-xs text-gray-500 border border-white/[0.08]">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirm('reset')}
                className="w-full py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(255,77,106,0.08)', color: '#FF4D6A', border: '1px solid rgba(255,77,106,0.2)' }}>
                🔄 Réinitialiser le personnage
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global / Branch rewards */}
      <div className="rpg-card p-5 space-y-4" style={{ border: '1px solid rgba(37,194,146,0.15)' }}>
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-[#25C292]" />
          <p className="text-white font-semibold text-sm">Récompenses globales</p>
        </div>
        <div className="flex gap-2">
          {(['global', 'branch'] as const).map(t => (
            <button key={t} onClick={() => setGlobalType(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={globalType === t
                ? { background: 'rgba(37,194,146,0.15)', color: '#25C292', border: '1px solid rgba(37,194,146,0.3)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)' }}>
              {t === 'global' ? '🌍 Tous les joueurs' : '🏷️ Par branche'}
            </button>
          ))}
        </div>
        {globalType === 'branch' && (
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4A843]/50">
            <option value="">Sélectionner une branche...</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
          </select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-500 text-xs mb-1 block">XP</label>
            <input type="number" min="0" step="50" value={globalXp} onChange={e => setGlobalXp(Number(e.target.value))}
              className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4A843]/50" />
          </div>
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Coins</label>
            <input type="number" min="0" step="50" value={globalCoins} onChange={e => setGlobalCoins(Number(e.target.value))}
              className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F59E0B]/50" />
          </div>
        </div>
        <input type="text" maxLength={200} value={globalMsg} onChange={e => setGlobalMsg(e.target.value)}
          placeholder="Message personnalisé (optionnel)"
          className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
        <button onClick={sendGlobalReward} disabled={sendingGlobal || (globalXp === 0 && globalCoins === 0)}
          className="w-full py-2.5 rounded-xl font-cinzel font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #25C292, #1A9B73)', color: '#080A12' }}>
          {sendingGlobal ? 'Envoi...' : '🎁 Envoyer'}
        </button>
      </div>
    </div>
  )
}
