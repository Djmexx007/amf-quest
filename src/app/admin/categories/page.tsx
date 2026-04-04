'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Tag, Trash2, Check, X, Pencil } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string
  game_type: string
  name: string
  icon: string | null
  color: string | null
  is_active: boolean
  order_index: number
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const GAME_OPTIONS = [
  { key: 'trivia-crack', label: 'Arène du Savoir', icon: '🏟️' },
  { key: 'quiz',         label: 'Quiz Éclair',      icon: '⚡' },
  { key: 'dungeon',      label: 'Donjon',            icon: '🏰' },
  { key: 'scenario',     label: 'Scénario',          icon: '🎭' },
  { key: 'detective',    label: 'Le Régulateur',     icon: '⚖️' },
]

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#F59E0B', '#25C292',
  '#D4A843', '#FF4D6A', '#EC4899', '#14B8A6',
]

const EMPTY_FORM = { name: '', icon: '', color: '#D4A843', game_type: 'trivia-crack', order_index: 0 }

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
  const { user } = useAuth()
  const { addToast } = useUIStore()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [gameFilter, setGameFilter] = useState('trivia-crack')

  // Create form
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  // Inline edit
  const [editId, setEditId]     = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', icon: '', color: '' })

  const isGod = user?.role === 'god'

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ game_type: gameFilter })
    // Pass is_active filter to see all (god sees inactive too via service role)
    const res = await fetch(`/api/admin/categories?${params}`)
    const data = await res.json()
    setCategories(data.categories ?? [])
    setLoading(false)
  }, [gameFilter])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { addToast({ type: 'error', title: 'Le nom est requis.' }); return }
    setSubmitting(true)
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, name: form.name.trim() }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
    addToast({ type: 'success', title: 'Catégorie créée.' })
    setForm({ ...EMPTY_FORM, game_type: gameFilter })
    setShowForm(false)
    fetchCategories()
  }

  async function handleUpdate(id: string) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name.trim(), icon: editForm.icon, color: editForm.color }),
    })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
    addToast({ type: 'success', title: 'Catégorie mise à jour.' })
    setEditId(null)
    fetchCategories()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Désactiver la catégorie "${name}" ? Les questions existantes ne seront pas affectées.`)) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }
    addToast({ type: 'success', title: 'Catégorie désactivée.' })
    fetchCategories()
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setEditForm({ name: cat.name, icon: cat.icon ?? '', color: cat.color ?? '#D4A843' })
  }

  if (!isGod) {
    return (
      <div className="page-container max-w-4xl">
        <div className="rpg-card p-10 text-center">
          <p className="text-gray-500">Accès réservé au GOD.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag size={22} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-white">Catégories</h1>
            <p className="text-gray-400 text-sm">Gérer les catégories de questions par jeu</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setForm({ ...EMPTY_FORM, game_type: gameFilter }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
          style={showForm
            ? { background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }
            : { background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }
          }
        >
          <Plus size={14} />
          {showForm ? 'Annuler' : 'Nouvelle catégorie'}
        </button>
      </div>

      {/* Game filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {GAME_OPTIONS.map(g => (
          <button
            key={g.key}
            onClick={() => setGameFilter(g.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={gameFilter === g.key
              ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }
              : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
            }
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rpg-card p-5 mb-5 space-y-4 animate-slide-up">
          <h3 className="text-white font-semibold text-sm">Nouvelle catégorie</h3>

          {/* Game type */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Jeu cible</label>
            <div className="flex flex-wrap gap-2">
              {GAME_OPTIONS.map(g => (
                <button type="button" key={g.key} onClick={() => setForm(f => ({ ...f, game_type: g.key }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={form.game_type === g.key
                    ? { background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#6B7280' }
                  }>
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex. Conformité"
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 outline-none border-b border-white/10 py-1.5 focus:border-white/30 transition-colors"
              required
            />
          </div>

          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Icône (emoji)</label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="✅"
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 outline-none border-b border-white/10 py-1.5 focus:border-white/30 transition-colors"
              />
            </div>

            {/* Order */}
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Ordre</label>
              <input
                type="number"
                value={form.order_index}
                onChange={e => setForm(f => ({ ...f, order_index: Number(e.target.value) }))}
                className="w-full bg-transparent text-white text-sm outline-none border-b border-white/10 py-1.5 focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Couleur</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: c, outline: form.color === c ? `2px solid white` : 'none', outlineOffset: '2px' }}
                >
                  {form.color === c && <Check size={10} className="text-white" />}
                </button>
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-6 h-6 rounded-full border-0 cursor-pointer"
                title="Couleur personnalisée"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Aperçu :</span>
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: `${form.color}15`,
                color: form.color,
                border: `1px solid ${form.color}30`,
              }}
            >
              {form.icon || '📌'} {form.name || 'Nom de la catégorie'}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
          >
            {submitting ? 'Création...' : 'Créer la catégorie'}
          </button>
        </form>
      )}

      {/* Category list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : categories.length === 0 ? (
        <div className="rpg-card p-10 text-center">
          <p className="text-gray-500 mb-3">Aucune catégorie pour ce jeu.</p>
          <button onClick={() => setShowForm(true)} className="text-[#D4A843] text-sm hover:underline">
            + Créer la première catégorie
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="rpg-card p-4">
              {editId === cat.id ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="flex-1 bg-transparent text-white text-sm outline-none border-b border-white/20 py-1 focus:border-[#D4A843]/50"
                    />
                    <input
                      value={editForm.icon}
                      onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))}
                      placeholder="emoji"
                      className="w-16 bg-transparent text-white text-sm outline-none border-b border-white/20 py-1 focus:border-[#D4A843]/50 text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, color: c }))}
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ background: c, outline: editForm.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                      <X size={12} /> Annuler
                    </button>
                    <button onClick={() => handleUpdate(cat.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{ background: 'rgba(37,194,146,0.15)', color: '#25C292', border: '1px solid rgba(37,194,146,0.3)' }}>
                      <Check size={12} /> Sauvegarder
                    </button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-semibold flex-shrink-0"
                    style={{
                      background: `${cat.color ?? '#D4A843'}15`,
                      color: cat.color ?? '#D4A843',
                      border: `1px solid ${cat.color ?? '#D4A843'}30`,
                    }}
                  >
                    {cat.icon} {cat.name}
                  </span>
                  <span className="text-xs text-gray-600 flex-1">ordre {cat.order_index}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#D4A843] hover:bg-[#D4A843]/10 transition-all" title="Modifier">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-all" title="Désactiver">
                      <Trash2 size={13} />
                    </button>
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
