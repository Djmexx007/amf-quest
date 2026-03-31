'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StarfieldBg from '@/components/layout/StarfieldBg'

interface Branch { id: string; name: string; icon: string; color: string }

interface InviteInfo {
  email: string
  full_name: string | null
  role: string
  expires_at: string
  suggested_branch_id: string | null
  branches: Branch[]
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [pseudo, setPseudo] = useState('')
  const [branchId, setBranchId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/invite/verify?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setNotFound(true)
        } else {
          setInvite(d)
          setPseudo(d.full_name ?? '')
          setBranchId(d.suggested_branch_id ?? (d.branches?.[0]?.id ?? ''))
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!pseudo.trim()) {
      setError('Choisis un pseudo.')
      return
    }
    if (invite?.branches && invite.branches.length > 0 && !branchId) {
      setError('Sélectionne ta branche.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          full_name: pseudo.trim(),
          branch_id: branchId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte.')
        return
      }
      // Cookies are set by the server — redirect straight to dashboard
      router.push('/dashboard')
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080A12] flex items-center justify-center">
        <div className="text-[#D4A843] font-cinzel text-lg animate-pulse">Vérification...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="relative min-h-screen bg-[#080A12] flex items-center justify-center">
        <StarfieldBg />
        <div className="relative z-10 text-center rpg-card p-10 max-w-md mx-4">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="font-cinzel text-2xl text-white mb-3">Invitation invalide</h1>
          <p className="text-gray-400 text-sm">
            Ce lien est expiré, déjà utilisé, ou n&apos;existe pas.
          </p>
          <a href="/login" className="mt-6 inline-block text-[#D4A843] text-sm hover:underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    )
  }

  const hasBranches = (invite?.branches?.length ?? 0) > 0

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080A12]">
      <StarfieldBg />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D4A843] opacity-[0.03] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 py-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float">⚔️</div>
          <h1 className="font-cinzel text-3xl font-bold tracking-widest mb-1"
              style={{ color: '#D4A843', textShadow: '0 0 20px rgba(212,168,67,0.4)' }}>
            AMF QUEST
          </h1>
          <p className="text-gray-400 text-sm">Tu as été invité à rejoindre le royaume</p>
        </div>

        <div className="rpg-card p-8">
          <div className="mb-6 p-4 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/20">
            <p className="text-[#D4A843] text-xs uppercase tracking-wider mb-1">Invitation pour</p>
            <p className="text-white font-semibold">{invite?.email}</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pseudo */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Pseudo <span className="normal-case text-gray-600">(nom affiché en jeu)</span>
              </label>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                required
                className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                placeholder="Ton nom de héros"
              />
            </div>

            {/* Branch selector */}
            {hasBranches && (
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                  Ta branche
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {invite!.branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBranchId(b.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-left transition-all"
                      style={{
                        background: branchId === b.id ? `${b.color}20` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${branchId === b.id ? b.color : 'rgba(255,255,255,0.08)'}`,
                        color: branchId === b.id ? b.color : '#9CA3AF',
                      }}
                    >
                      <span className="text-xl">{b.icon}</span>
                      <span>{b.name}</span>
                      {branchId === b.id && <span className="ml-auto text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                placeholder="Minimum 8 caractères"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Confirme le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #D4A843, #B8892A)',
                color: '#080A12',
                boxShadow: '0 0 20px rgba(212,168,67,0.3)',
              }}
            >
              {submitting ? 'Création...' : 'Rejoindre AMF Quest ⚔️'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
