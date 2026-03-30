'use client'

import { useState } from 'react'
import { Settings, Bell, Shield, Database, Save } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export default function AdminSettingsPage() {
  const { addToast } = useUIStore()
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      addToast({ type: 'success', title: 'Paramètres enregistrés.' })
      setSaving(false)
    }, 600)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-[#FF4D6A]" />
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Paramètres</h1>
          <p className="text-gray-400 text-sm">Configuration de la plateforme</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Notifications */}
        <div className="rpg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-[#D4A843]" />
            <h2 className="font-cinzel font-bold text-white text-sm">Notifications</h2>
          </div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Emails d'invitation</p>
              <p className="text-gray-500 text-xs">Envoyer automatiquement les invitations par email</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailNotifs(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
              style={{ background: emailNotifs ? '#D4A843' : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ left: emailNotifs ? '22px' : '2px' }}
              />
            </button>
          </label>
        </div>

        {/* Security */}
        <div className="rpg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[#FF4D6A]" />
            <h2 className="font-cinzel font-bold text-white text-sm">Sécurité</h2>
          </div>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Mode maintenance</p>
              <p className="text-gray-500 text-xs">Bloquer l'accès aux utilisateurs non-admin</p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
              style={{ background: maintenanceMode ? '#FF4D6A' : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ left: maintenanceMode ? '22px' : '2px' }}
              />
            </button>
          </label>
        </div>

        {/* System info */}
        <div className="rpg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-[#4D8BFF]" />
            <h2 className="font-cinzel font-bold text-white text-sm">Système</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Base de données', value: 'Supabase PostgreSQL' },
              { label: 'Environnement', value: process.env.NODE_ENV ?? 'production' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <span className="text-gray-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
        >
          <Save size={14} />{saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </form>
    </div>
  )
}
