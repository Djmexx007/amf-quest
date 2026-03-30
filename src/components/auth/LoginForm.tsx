'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const STATUS_MESSAGES: Record<string, string> = {
  suspended: 'Ton compte est suspendu temporairement.',
  banned: 'Ton compte a été banni.',
  expired: 'Ton compte temporaire a expiré.',
}

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const reason = params.get('reason')
    if (reason && STATUS_MESSAGES[reason]) setError(STATUS_MESSAGES[reason])
    const welcome = params.get('welcome')
    if (welcome) setError('')
  }, [params])

  const redirectTo = params.get('redirect') ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Une erreur est survenue.'); return }
      const user = data.user
      if (user.role === 'god') router.push('/god')
      else if (user.role === 'admin' || user.role === 'moderator') router.push('/admin')
      else if (!user.selected_branch_id) router.push('/select-branch')
      else router.push(redirectTo)
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4 animate-float">⚔️</div>
        <h1 className="font-cinzel text-4xl font-bold tracking-widest mb-2"
          style={{ color: '#D4A843', textShadow: '0 0 30px rgba(212,168,67,0.5)' }}>
          AMF QUEST
        </h1>
        <p className="text-gray-400 text-sm tracking-wider uppercase">Prépare ton examen en jouant</p>
      </div>

      <div className="rpg-card p-8">
        <h2 className="font-cinzel text-xl font-semibold text-white mb-6 text-center tracking-wide">Connexion</h2>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Adresse email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 focus:ring-1 focus:ring-[#D4A843]/30 transition-colors placeholder-gray-600"
              placeholder="ton@email.com" />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 focus:ring-1 focus:ring-[#D4A843]/30 transition-colors placeholder-gray-600"
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gold-btn">
            {loading ? 'Connexion...' : 'Entrer dans le royaume'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">Pas de compte ? Contacte ton administrateur.</p>
      </div>

      <p className="text-center text-gray-700 text-xs mt-6">AMF Quest v0.1 · Accès sur invitation seulement</p>

      <style jsx>{`
        .gold-btn {
          background: linear-gradient(135deg, #D4A843, #B8892A);
          color: #080A12;
          box-shadow: 0 0 20px rgba(212,168,67,0.3);
        }
        .gold-btn:disabled {
          background: rgba(212,168,67,0.2);
          box-shadow: none;
          color: rgba(8,10,18,0.5);
        }
      `}</style>
    </div>
  )
}
