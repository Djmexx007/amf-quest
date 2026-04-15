'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, BookOpen, ChevronLeft, ChevronRight, Trash2, Pencil, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'

// ── Types ──────────────────────────────────────────────────────────────────

interface Branch { id: string; slug: string; name: string; color: string; icon: string }
interface Category { id: string; name: string; icon: string | null; color: string | null }
interface QuestionRow {
  id: string
  question: string
  context: string | null
  answers: string[]
  correct_answer: string
  branch: string
  category: string
  is_scenario: boolean
  created_at: string
  times_used: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

const EMPTY_ANSWERS = ['', '', '', '']

function initAnswers(n = 4): string[] {
  return Array.from({ length: n }, () => '')
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminQuestionsPage() {
  const { user } = useAuth()
  const { addToast } = useUIStore()
  const isGod = user?.role === 'god'
  const isMod = user?.role === 'moderator' || isGod

  const [view, setView] = useState<'list' | 'create'>('list')

  // ── Liste ──
  const [questions, setQuestions]     = useState<QuestionRow[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [branchFilter, setBranchFilter] = useState('')
  const [loadingList, setLoadingList] = useState(true)

  // ── Formulaire création ──
  const [branches, setBranches]         = useState<Branch[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [branch, setBranch]             = useState('')
  const [category, setCategory]         = useState('')
  const [questionText, setQuestionText] = useState('')
  const [contextText, setContextText]   = useState('')
  const [isScenario, setIsScenario]     = useState(false)
  const [answers, setAnswers]           = useState<string[]>(initAnswers())
  const [correctIdx, setCorrectIdx]     = useState(0)
  const [submitting, setSubmitting]     = useState(false)

  // ── Édition inline (god only) ──
  const [editId, setEditId]                 = useState<string | null>(null)
  const [editQuestion, setEditQuestion]     = useState('')
  const [editContext, setEditContext]       = useState('')
  const [editAnswers, setEditAnswers]       = useState<string[]>([])
  const [editCorrectIdx, setEditCorrectIdx] = useState(0)
  const [editCategory, setEditCategory]     = useState('')
  const [editScenario, setEditScenario]     = useState(false)
  const [editSaving, setEditSaving]         = useState(false)

  const perPage    = 20
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // ── Chargement branche → catégories ──
  useEffect(() => {
    if (!branch) { setCategories([]); setCategory(''); return }
    fetch(`/api/admin/categories?branch=${encodeURIComponent(branch)}`)
      .then(r => r.json())
      .then(d => {
        const cats = d.categories ?? []
        setCategories(cats)
        setCategory(cats[0]?.name ?? '')
      })
  }, [branch])

  // ── Chargement liste ──
  const fetchQuestions = useCallback(async () => {
    setLoadingList(true)
    const params = new URLSearchParams({ page: String(page) })
    if (branchFilter) params.set('branch', branchFilter)
    const res = await fetch(`/api/admin/questions?${params}`)
    const data = await res.json()
    setQuestions(data.questions ?? [])
    setTotal(data.total ?? 0)
    setLoadingList(false)
  }, [page, branchFilter])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  // ── Init branches ──
  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => {
      const b: Branch[] = d.branches ?? []
      setBranches(b)
      if (b.length && !branch) setBranch(b[0].slug)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit création ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!branch) {
      addToast({ type: 'error', title: 'Sélectionne une branche.' }); return
    }
    if (!category) {
      addToast({ type: 'error', title: 'Sélectionne une catégorie.' }); return
    }
    if (!questionText.trim()) {
      addToast({ type: 'error', title: 'La question est obligatoire.' }); return
    }
    if (isScenario && !contextText.trim()) {
      addToast({ type: 'error', title: 'Le contexte est obligatoire pour un scénario.' }); return
    }

    const filled = answers.map(a => a.trim()).filter(Boolean)
    if (filled.length < 2) {
      addToast({ type: 'error', title: 'Au moins 2 réponses requises.' }); return
    }
    if (!filled[correctIdx]?.trim()) {
      addToast({ type: 'error', title: 'La bonne réponse ne peut pas être vide.' }); return
    }

    setSubmitting(true)
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch,
        category,
        question:       questionText.trim(),
        context:        isScenario ? contextText.trim() : undefined,
        answers:        filled,
        correct_answer: filled[correctIdx] ?? filled[0],
        is_scenario:    isScenario,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }

    addToast({ type: 'success', title: data.message })
    // Réinitialiser le formulaire
    setQuestionText(''); setContextText(''); setIsScenario(false)
    setAnswers(initAnswers()); setCorrectIdx(0)
    setView('list')
    fetchQuestions()
  }

  // ── Supprimer ──
  async function handleDelete(id: string, isGodUser: boolean) {
    const msg = isGodUser
      ? 'Supprimer définitivement cette question ?'
      : 'Envoyer une demande de suppression au God Panel ?'
    if (!confirm(msg)) return

    const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error }); return }
    addToast({ type: 'success', title: data.message })
    fetchQuestions()
  }

  // ── Édition ──
  function startEdit(q: QuestionRow) {
    setEditId(q.id)
    setEditQuestion(q.question)
    setEditContext(q.context ?? '')
    setEditAnswers([...q.answers])
    const ci = q.answers.indexOf(q.correct_answer)
    setEditCorrectIdx(ci >= 0 ? ci : 0)
    setEditCategory(q.category)
    setEditScenario(q.is_scenario)
  }

  async function saveEdit() {
    if (!editId) return
    const filled = editAnswers.map(a => a.trim()).filter(Boolean)
    if (filled.length < 2) {
      addToast({ type: 'error', title: 'Au moins 2 réponses requises.' }); return
    }
    setEditSaving(true)
    const res = await fetch(`/api/admin/questions/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:       editQuestion.trim(),
        context:        editScenario ? editContext.trim() : null,
        answers:        filled,
        correct_answer: filled[editCorrectIdx] ?? filled[0],
        category:       editCategory,
        is_scenario:    editScenario,
      }),
    })
    const data = await res.json()
    setEditSaving(false)
    if (!res.ok) { addToast({ type: 'error', title: data.error }); return }
    addToast({ type: 'success', title: data.message })
    setEditId(null)
    fetchQuestions()
  }

  // ── Render ──
  return (
    <div className="page-container">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-white">Questions</h1>
            <p className="text-gray-400 text-sm">Questions universelles — difficulté gérée par le gameplay</p>
          </div>
        </div>
        <button
          onClick={() => setView(view === 'list' ? 'create' : 'list')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
          style={{
            background: view === 'create' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #D4A843, #B8892A)',
            color: view === 'create' ? '#9CA3AF' : '#080A12',
          }}
        >
          <Plus size={14} />
          {view === 'create' ? 'Voir la liste' : 'Nouvelle question'}
        </button>
      </div>

      {/* ── LISTE ─────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Filtres */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => { setBranchFilter(''); setPage(1) }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={!branchFilter
                ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }
                : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Toutes
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => { setBranchFilter(b.slug); setPage(1) }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={branchFilter === b.slug
                  ? { background: `${b.color}20`, color: b.color, border: `1px solid ${b.color}50` }
                  : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {b.icon} {b.name}
              </button>
            ))}
          </div>

          {loadingList ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : questions.length === 0 ? (
            <div className="rpg-card p-10 text-center">
              <p className="text-gray-500 mb-3">Aucune question trouvée.</p>
              <button onClick={() => setView('create')} className="text-[#D4A843] text-sm hover:underline">
                + Créer la première question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className="rpg-card p-4">
                  {editId === q.id ? (
                    /* ── Mode édition inline (god only) ── */
                    <div className="space-y-3">
                      <textarea
                        value={editQuestion}
                        onChange={e => setEditQuestion(e.target.value)}
                        rows={2}
                        className="w-full bg-transparent text-white text-sm outline-none border border-white/10 rounded-lg px-3 py-2 resize-none"
                      />
                      {/* Scénario toggle */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-400">Scénario</label>
                        <button
                          type="button"
                          onClick={() => setEditScenario(v => !v)}
                          className="w-10 h-5 rounded-full transition-all relative"
                          style={{ background: editScenario ? '#8B5CF6' : 'rgba(255,255,255,0.1)' }}
                        >
                          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: editScenario ? '22px' : '2px' }} />
                        </button>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          placeholder="Catégorie"
                          className="flex-1 bg-transparent text-white text-xs outline-none border border-white/10 rounded px-2 py-1"
                        />
                      </div>
                      {editScenario && (
                        <textarea
                          value={editContext}
                          onChange={e => setEditContext(e.target.value)}
                          rows={2}
                          placeholder="Contexte du scénario..."
                          className="w-full bg-transparent text-white text-xs outline-none border border-purple-500/20 rounded-lg px-3 py-2 resize-none"
                        />
                      )}
                      <div className="space-y-1">
                        {editAnswers.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditCorrectIdx(i)}
                              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs transition-all border"
                              style={editCorrectIdx === i
                                ? { background: 'rgba(37,194,146,0.2)', borderColor: '#25C292', color: '#25C292' }
                                : { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#4B5563' }}
                            >✓</button>
                            <input
                              value={a}
                              onChange={e => setEditAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                              className="flex-1 bg-transparent text-white text-xs outline-none border-b border-white/10 py-1"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEdit} disabled={editSaving}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(37,194,146,0.15)', border: '1px solid rgba(37,194,146,0.3)', color: '#25C292' }}>
                          {editSaving ? '...' : 'Sauvegarder'}
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Affichage normal ── */
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug line-clamp-2">{q.question}</p>
                        {q.is_scenario && (
                          <p className="text-xs text-purple-400 mt-0.5 line-clamp-1">{q.context}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(212,168,67,0.1)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.2)' }}>
                            {q.branch}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(77,139,255,0.1)', color: '#4D8BFF', border: '1px solid rgba(77,139,255,0.2)' }}>
                            {q.category}
                          </span>
                          {q.is_scenario && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}>
                              🎭 Scénario
                            </span>
                          )}
                          <span className="text-xs text-gray-600">✓ {q.correct_answer}</span>
                          {q.times_used > 0 && (
                            <span className="text-xs text-gray-600">⟳ {q.times_used}×</span>
                          )}
                          <span className="text-xs text-gray-600">
                            {new Date(q.created_at).toLocaleDateString('fr-CA')}
                          </span>
                        </div>
                      </div>

                      {isMod && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isGod && (
                            <button onClick={() => startEdit(q)}
                              className="p-1.5 rounded-lg text-[#D4A843] hover:bg-[#D4A843]/10 transition-all" title="Modifier">
                              <Pencil size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(q.id, isGod)}
                            className="p-1.5 rounded-lg text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-all"
                            title={isGod ? 'Supprimer' : 'Demander la suppression'}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-gray-500 text-xs">{total} question{total > 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition-all">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-gray-400 text-sm self-center">{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 disabled:opacity-30 transition-all">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FORMULAIRE CRÉATION ──────────────────────────────────── */}
      {view === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">

          {/* Branche */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Branche *</label>
            <div className="flex flex-wrap gap-2">
              {branches.map(b => (
                <button type="button" key={b.id} onClick={() => setBranch(b.slug)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={branch === b.slug
                    ? { background: `${b.color}20`, border: `1px solid ${b.color}50`, color: b.color }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
                  {b.icon} {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Catégorie *</label>
            {categories.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucune catégorie pour cette branche — créez-en via le Panneau Catégories.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button type="button" key={c.id} onClick={() => setCategory(c.name)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={category === c.name
                      ? { background: `${c.color ?? '#D4A843'}20`, border: `1px solid ${c.color ?? '#D4A843'}50`, color: c.color ?? '#D4A843' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle scénario */}
          <div className="rpg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Mode scénario</p>
                <p className="text-xs text-gray-500 mt-0.5">La question présente un cas client — le contexte devient obligatoire</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScenario(v => !v)}
                className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                style={{ background: isScenario ? '#8B5CF6' : 'rgba(255,255,255,0.1)' }}
              >
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: isScenario ? '26px' : '4px' }} />
              </button>
            </div>
          </div>

          {/* Contexte (scénario uniquement) */}
          {isScenario && (
            <div className="rpg-card p-5 border border-purple-500/20">
              <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#A78BFA' }}>
                Contexte du scénario *
              </label>
              <textarea
                value={contextText}
                onChange={e => setContextText(e.target.value)}
                rows={3}
                placeholder="Un client de 65 ans, retraité, souhaite investir 50 000$ en..."
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
                required
              />
            </div>
          )}

          {/* Question */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Question *</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Selon la réglementation AMF, qu'est-ce que..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
              required
            />
          </div>

          {/* Réponses */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">Réponses *</label>
            <p className="text-xs text-gray-600 mb-3">Cliquer sur ✓ pour marquer la bonne réponse. Min. 2 requises.</p>
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectIdx(i)}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all border"
                    style={correctIdx === i
                      ? { background: 'rgba(37,194,146,0.2)', borderColor: '#25C292', color: '#25C292' }
                      : { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#4B5563' }}>
                    ✓
                  </button>
                  <input
                    value={a}
                    onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Réponse ${i + 1}${i >= 2 ? ' (optionnel)' : ''}`}
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none border-b border-white/10 py-1.5 focus:border-white/30 transition-colors"
                  />
                </div>
              ))}
            </div>
            {/* Ajouter une réponse */}
            {answers.length < 6 && (
              <button type="button" onClick={() => setAnswers(prev => [...prev, ''])}
                className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                + Ajouter une réponse
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
            >
              {submitting ? 'Création...' : '✨ Créer la question'}
            </button>
            <button type="button" onClick={() => setView('list')}
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
              Annuler
            </button>
          </div>

        </form>
      )}
    </div>
  )
}
