'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StarfieldBg from '@/components/layout/StarfieldBg'
import { useAuthStore } from '@/stores/authStore'

interface Branch {
  id: string
  slug: string
  name: string
  description: string
  color: string
  icon: string
  exam_provider: string
}

export default function SelectBranchPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => setBranches(d.branches ?? []))
  }, [])

  const selectedBranch = branches.find((b) => b.id === selected)

  async function handleConfirm() {
    if (!selected) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/branches/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: selected, character_name: characterName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la sélection.')
        return
      }
      // Update the cached user in the store so AuthProvider doesn't redirect back
      if (user) {
        setUser({ ...user, selected_branch_id: selected, branch_locked: true })
      }
      router.push('/dashboard')
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#080A12] flex items-center justify-center overflow-hidden">
      <StarfieldBg />

      {/* Background glow based on selection */}
      {selectedBranch && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px] opacity-5 pointer-events-none transition-colors duration-500"
          style={{ background: selectedBranch.color }}
        />
      )}

      <div className="relative z-10 w-full max-w-3xl px-6 py-10 animate-slide-up">
        <div className="text-center mb-10">
          <h1 className="font-cinzel text-3xl font-bold text-white mb-3 tracking-wider">
            Choisis ta voie
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Cette décision est <span className="text-[#D4A843] font-semibold">irréversible</span> —
            comme le choix de ton starter dans Pokémon. Choisis avec soin.
          </p>
        </div>

        {/* Branch cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {branches.map((branch) => {
            const isSelected = selected === branch.id
            return (
              <button
                key={branch.id}
                onClick={() => { setSelected(branch.id); setConfirmed(false) }}
                className="text-left rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer"
                style={{
                  background: isSelected ? `${branch.color}15` : '#111628',
                  borderColor: isSelected ? branch.color : 'rgba(255,255,255,0.08)',
                  boxShadow: isSelected ? `0 0 30px ${branch.color}30` : 'none',
                }}
              >
                <div className="text-4xl mb-4">{branch.icon}</div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: branch.color }}
                >
                  {branch.exam_provider}
                </div>
                <h3 className="font-cinzel text-lg font-bold text-white mb-3">
                  {branch.name}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {branch.description}
                </p>

                {isSelected && (
                  <div
                    className="mt-4 flex items-center gap-2 text-sm font-semibold"
                    style={{ color: branch.color }}
                  >
                    <span>✓</span>
                    <span>Sélectionné</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Character name + confirm */}
        {selected && (
          <div className="rpg-card p-6 animate-slide-up">
            <div className="mb-5">
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                Nom de ton personnage (optionnel)
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                maxLength={30}
                className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                placeholder="Laisse vide pour utiliser ton email"
              />
            </div>

            {!confirmed ? (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Attention — Tu es sur le point de choisir{' '}
                    <strong>{selectedBranch?.name}</strong>. Cette décision est définitive
                    et ne peut être annulée qu'avec l'aide d'un administrateur.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmed(true)}
                  className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase border transition-all"
                  style={{
                    borderColor: selectedBranch?.color,
                    color: selectedBranch?.color,
                    background: `${selectedBranch?.color}10`,
                  }}
                >
                  Je comprends, continuer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${selectedBranch?.color}, ${selectedBranch?.color}99)`,
                    color: '#080A12',
                    boxShadow: `0 0 20px ${selectedBranch?.color}40`,
                  }}
                >
                  {loading ? 'Chargement...' : `Commencer mon aventure — ${selectedBranch?.name}`}
                </button>
                <button
                  onClick={() => setConfirmed(false)}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
