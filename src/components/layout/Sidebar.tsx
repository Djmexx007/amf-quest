'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard, Swords, Trophy, BookOpen,
  Users, BarChart3, Crown, ShieldCheck,
  ChevronDown, GitBranch, ArrowRightLeft, ShoppingBag, Medal,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
  { href: '/games',        label: 'Mini-jeux',  icon: <Swords size={18} /> },
  { href: '/shop',         label: 'Boutique',   icon: <ShoppingBag size={18} /> },
  { href: '/achievements', label: 'Succès',     icon: <Medal size={18} /> },
  { href: '/leaderboard',  label: 'Classement', icon: <Trophy size={18} /> },
  { href: '/modules',      label: 'Modules',    icon: <BookOpen size={18} /> },
]

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin',                 label: 'Admin',       icon: <ShieldCheck size={18} />, roles: ['moderator', 'god'] },
  { href: '/admin/questions',       label: 'Questions',   icon: <BookOpen size={18} />,    roles: ['moderator', 'god'] },
  { href: '/admin/branch-requests', label: 'Changements', icon: <ArrowRightLeft size={18} />, roles: ['moderator', 'god'] },
  { href: '/admin/invites',         label: 'Invitations', icon: <Users size={18} />,       roles: ['moderator', 'god'] },
  { href: '/admin/users',           label: 'Utilisateurs',icon: <Users size={18} />,       roles: ['moderator', 'god'] },
  { href: '/admin/analytics',       label: 'Analytics',   icon: <BarChart3 size={18} />,   roles: ['moderator', 'god'] },
  { href: '/god',                   label: 'GOD Panel',   icon: <Crown size={18} />,       roles: ['god'] },
]

interface Branch { id: string; name: string; color: string; icon: string }

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { sidebarOpen } = useUIStore()
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    if (!user) return
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches ?? [])).catch(() => {})
  }, [user])

  if (!sidebarOpen) return null

  const visibleAdminItems = ADMIN_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  const isAdminOrGod = user?.role === 'moderator' || user?.role === 'god'

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col"
      style={{ background: '#0D1221', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <span className="font-cinzel text-sm font-bold text-[#D4A843] tracking-widest">AMF QUEST</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}

        {visibleAdminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-2">
              <p className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Administration</p>
            </div>
            {visibleAdminItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Branch footer */}
      {user?.selected_branch_id && (
        isAdminOrGod
          ? <BranchSwitcher currentBranchId={user.selected_branch_id} branches={branches} />
          : <BranchFooter currentBranchId={user.selected_branch_id} branches={branches} />
      )}
    </aside>
  )
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive ? 'text-white bg-[#D4A843]/10 border border-[#D4A843]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      style={isActive ? { color: '#D4A843' } : {}}
    >
      <span className={isActive ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

// Admin/God: dropdown to switch branches instantly
function BranchSwitcher({ currentBranchId, branches }: { currentBranchId: string; branches: Branch[] }) {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const current = branches.find(b => b.id === currentBranchId)

  async function switchBranch(branchId: string) {
    if (branchId === currentBranchId || loading) return
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch('/api/branches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId }),
      })
      if (res.ok) {
        setUser(null) // force re-fetch of user from new token
        router.push('/dashboard')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-gray-600 text-xs uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
        <ArrowRightLeft size={10} /> Branche active
      </p>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="w-full flex items-center justify-between px-2 py-2 rounded-lg transition-all hover:bg-white/5"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{current?.icon ?? '🌿'}</span>
          <span className="text-sm font-semibold truncate" style={{ color: current?.color ?? '#D4A843' }}>
            {loading ? 'Changement...' : (current?.name ?? 'Choisir')}
          </span>
        </div>
        <ChevronDown size={14} className={`text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && branches.length > 0 && (
        <div
          className="absolute bottom-full left-3 right-3 mb-1 rounded-lg overflow-hidden z-50"
          style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)' }}
        >
          {branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => switchBranch(branch.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-all hover:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-base">{branch.icon}</span>
              <span
                className="font-medium truncate"
                style={{ color: branch.id === currentBranchId ? branch.color : '#9CA3AF' }}
              >
                {branch.name}
              </span>
              {branch.id === currentBranchId && (
                <span className="ml-auto text-xs" style={{ color: branch.color }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// User: show branch + button to request change
function BranchFooter({ currentBranchId, branches }: { currentBranchId: string; branches: Branch[] }) {
  const current = branches.find(b => b.id === currentBranchId)
  const others = branches.filter(b => b.id !== currentBranchId)
  const [showModal, setShowModal] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<{ status: string; to_branch: { name: string; color: string; icon: string } } | null>(null)

  useEffect(() => {
    fetch('/api/branches/change-request')
      .then(r => r.json())
      .then(d => { if (d.request) setPendingRequest(d.request) })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
          <GitBranch size={10} /> Branche
        </p>
        <div className="flex items-center gap-2 px-1 mb-2">
          <span className="text-base">{current?.icon ?? '🌿'}</span>
          <span className="text-sm font-semibold truncate" style={{ color: current?.color ?? '#D4A843' }}>
            {current?.name ?? '—'}
          </span>
        </div>

        {pendingRequest ? (
          <div className="px-1">
            <div className="text-xs px-2 py-1.5 rounded-lg"
              style={{
                background: pendingRequest.status === 'pending' ? 'rgba(245,158,11,0.08)' : pendingRequest.status === 'approved' ? 'rgba(37,194,146,0.08)' : 'rgba(255,77,106,0.08)',
                border: `1px solid ${pendingRequest.status === 'pending' ? 'rgba(245,158,11,0.2)' : pendingRequest.status === 'approved' ? 'rgba(37,194,146,0.2)' : 'rgba(255,77,106,0.2)'}`,
                color: pendingRequest.status === 'pending' ? '#F59E0B' : pendingRequest.status === 'approved' ? '#25C292' : '#FF4D6A',
              }}>
              {pendingRequest.status === 'pending' ? '⏳ Demande en attente' : pendingRequest.status === 'approved' ? '✓ Demande approuvée' : '✗ Demande refusée'}
            </div>
          </div>
        ) : others.length > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full text-xs px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-all hover:bg-white/5 text-left"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Demander un changement
          </button>
        )}
      </div>

      {showModal && (
        <BranchChangeModal
          currentBranch={current}
          branches={others}
          onClose={() => setShowModal(false)}
          onSuccess={(req) => { setPendingRequest(req); setShowModal(false) }}
        />
      )}
    </>
  )
}

function BranchChangeModal({
  currentBranch, branches, onClose, onSuccess,
}: {
  currentBranch: Branch | undefined
  branches: Branch[]
  onClose: () => void
  onSuccess: (req: { status: string; to_branch: { name: string; color: string; icon: string } }) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/branches/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_branch_id: selected, reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }
      const branch = branches.find(b => b.id === selected)!
      onSuccess({ status: 'pending', to_branch: { name: branch.name, color: branch.color, icon: branch.icon } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-xl p-6" style={{ background: '#111628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="font-cinzel font-bold text-white mb-1">Changer de branche</h3>
        <p className="text-gray-500 text-xs mb-5">
          Ta demande sera examinée par un administrateur. Tu resteras sur <span className="text-white">{currentBranch?.name}</span> en attendant.
        </p>

        <div className="space-y-2 mb-4">
          {branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => setSelected(branch.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left"
              style={{
                background: selected === branch.id ? `${branch.color}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected === branch.id ? branch.color : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <span className="text-xl">{branch.icon}</span>
              <span className="font-semibold text-sm" style={{ color: selected === branch.id ? branch.color : '#9CA3AF' }}>
                {branch.name}
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Raison du changement (optionnel)"
          rows={2}
          className="w-full bg-[#080A12] border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#D4A843]/50 mb-4"
        />

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!selected || loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #D4A843, #D4A84399)', color: '#080A12' }}
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}
