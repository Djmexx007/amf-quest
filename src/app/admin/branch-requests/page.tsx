'use client'

import { useEffect, useState } from 'react'
import { GitBranch, Check, X, Clock, ChevronDown } from 'lucide-react'

interface BranchReq {
  id: string
  status: string
  reason: string | null
  created_at: string
  user: { full_name: string; email: string }
  from_branch: { id: string; name: string; color: string; icon: string }
  to_branch: { id: string; name: string; color: string; icon: string }
}

export default function BranchRequestsPage() {
  const [requests, setRequests] = useState<BranchReq[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function load(status: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/branch-requests?status=${status}`)
    const data = await res.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    try {
      const res = await fetch(`/api/admin/branch-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        showToast(action === 'approve' ? 'Demande approuvée' : 'Demande refusée', action === 'approve')
        setRequests(prev => prev.filter(r => r.id !== id))
      } else {
        const d = await res.json()
        showToast(d.error ?? 'Erreur.', false)
      }
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch size={22} className="text-[#D4A843]" />
        <div>
          <h1 className="font-cinzel text-xl font-bold text-white">Demandes de branche</h1>
          <p className="text-gray-500 text-sm">Approuver ou refuser les changements de branche</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'pending', label: 'En attente', color: '#F59E0B' },
          { value: 'approved', label: 'Approuvées', color: '#25C292' },
          { value: 'rejected', label: 'Refusées', color: '#FF4D6A' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: statusFilter === tab.value ? `${tab.color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${statusFilter === tab.value ? tab.color : 'rgba(255,255,255,0.08)'}`,
              color: statusFilter === tab.value ? tab.color : '#6B7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-600">Chargement...</div>
      ) : requests.length === 0 ? (
        <div className="rpg-card p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">Aucune demande {statusFilter === 'pending' ? 'en attente' : statusFilter === 'approved' ? 'approuvée' : 'refusée'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="rpg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* User */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#D4A843]/20 text-[#D4A843]">
                      {req.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{req.user.full_name}</p>
                      <p className="text-gray-500 text-xs">{req.user.email}</p>
                    </div>
                  </div>

                  {/* Branch change arrow */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: `${req.from_branch.color}15`, color: req.from_branch.color, border: `1px solid ${req.from_branch.color}30` }}>
                      <span>{req.from_branch.icon}</span> {req.from_branch.name}
                    </div>
                    <ChevronDown size={14} className="text-gray-600 -rotate-90" />
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: `${req.to_branch.color}15`, color: req.to_branch.color, border: `1px solid ${req.to_branch.color}30` }}>
                      <span>{req.to_branch.icon}</span> {req.to_branch.name}
                    </div>
                  </div>

                  {req.reason && (
                    <p className="text-gray-400 text-xs italic bg-white/3 px-3 py-2 rounded-lg border border-white/5">
                      "{req.reason}"
                    </p>
                  )}

                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(req.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Actions */}
                {statusFilter === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => act(req.id, 'reject')}
                      disabled={acting === req.id}
                      className="p-2 rounded-lg transition-all hover:bg-red-500/10 disabled:opacity-40"
                      style={{ border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A' }}
                      title="Refuser"
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={() => act(req.id, 'approve')}
                      disabled={acting === req.id}
                      className="p-2 rounded-lg transition-all hover:bg-green-500/10 disabled:opacity-40"
                      style={{ border: '1px solid rgba(37,194,146,0.2)', color: '#25C292' }}
                      title="Approuver"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                )}

                {statusFilter !== 'pending' && (
                  <div className="flex-shrink-0">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{
                        background: req.status === 'approved' ? 'rgba(37,194,146,0.1)' : 'rgba(255,77,106,0.1)',
                        color: req.status === 'approved' ? '#25C292' : '#FF4D6A',
                      }}>
                      {req.status === 'approved' ? '✓ Approuvée' : '✗ Refusée'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50 shadow-lg"
          style={{
            background: toast.ok ? 'rgba(37,194,146,0.15)' : 'rgba(255,77,106,0.15)',
            border: `1px solid ${toast.ok ? 'rgba(37,194,146,0.3)' : 'rgba(255,77,106,0.3)'}`,
            color: toast.ok ? '#25C292' : '#FF4D6A',
          }}
        >
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}
