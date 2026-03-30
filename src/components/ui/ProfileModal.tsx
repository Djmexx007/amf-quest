'use client'

import { useState } from 'react'
import { X, Save, KeyRound, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

import type { UserRole, UserStatus } from '@/types'

interface Props {
  user: { id: string; email: string; full_name: string; role: UserRole; status: UserStatus; selected_branch_id: string | null; branch_locked: boolean }
  onClose: () => void
}

type Tab = 'profile' | 'password'

export default function ProfileModal({ user, onClose }: Props) {
  const { setUser } = useAuthStore()
  const { addToast } = useUIStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [fullName, setFullName] = useState(user.full_name)
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSavingProfile(true)
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur lors de la mise à jour.' }); return }
      setUser({ ...user, full_name: fullName.trim() })
      addToast({ type: 'success', title: 'Profil mis à jour !' })
      onClose()
    } catch {
      addToast({ type: 'error', title: 'Impossible de contacter le serveur.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { addToast({ type: 'error', title: 'Les mots de passe ne correspondent pas.' }); return }
    if (newPassword.length < 8) { addToast({ type: 'error', title: 'Minimum 8 caractères.' }); return }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
      addToast({ type: 'success', title: 'Mot de passe modifié !' })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch {
      addToast({ type: 'error', title: 'Erreur serveur.' })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="rpg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <h2 className="font-cinzel font-bold text-white">Mon profil</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Avatar display */}
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3"
              style={{ background: 'rgba(212,168,67,0.15)', border: '2px solid rgba(212,168,67,0.4)', color: '#D4A843' }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 px-6">
            {[
              { key: 'profile' as Tab, label: 'Profil', icon: <User size={14} /> },
              { key: 'password' as Tab, label: 'Mot de passe', icon: <KeyRound size={14} /> },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{ borderColor: tab === t.key ? '#D4A843' : 'transparent', color: tab === t.key ? '#D4A843' : '#6B7280' }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Prénom et nom</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                    className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Email</label>
                  <input type="email" value={user.email} disabled
                    className="w-full bg-[#080A12] border border-white/5 rounded-lg px-4 py-3 text-gray-500 text-sm cursor-not-allowed" />
                  <p className="text-gray-600 text-xs mt-1">L'email ne peut pas être modifié.</p>
                </div>
                <button type="submit" disabled={savingProfile || !fullName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
                  <Save size={14} />{savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            )}

            {tab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {[
                  { label: 'Mot de passe actuel', value: currentPassword, set: setCurrentPassword, complete: 'current-password' },
                  { label: 'Nouveau mot de passe', value: newPassword, set: setNewPassword, complete: 'new-password' },
                  { label: 'Confirmer le nouveau', value: confirmPassword, set: setConfirmPassword, complete: 'new-password' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">{field.label}</label>
                    <input type="password" value={field.value} onChange={e => field.set(e.target.value)} required
                      autoComplete={field.complete} minLength={field.label === 'Mot de passe actuel' ? undefined : 8}
                      className="w-full bg-[#080A12] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4A843]/50 transition-colors"
                      placeholder="••••••••" />
                  </div>
                ))}
                <button type="submit" disabled={savingPassword}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
                  <KeyRound size={14} />{savingPassword ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
