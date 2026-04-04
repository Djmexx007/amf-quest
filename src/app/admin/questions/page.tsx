'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, BookOpen, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
  Trash2, EyeOff, Tag, Filter,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'

// ── Types ──────────────────────────────────────────────────────────────────
interface Branch { id: string; name: string; color: string; icon: string }
interface Category { id: string; name: string; icon: string | null; color: string | null; game_type: string }
interface AnswerDraft { answer_text: string; is_correct: boolean }
interface QuestionRow {
  id: string
  question_text: string
  question_type: string
  difficulty: 1 | 2 | 3
  status: 'pending' | 'approved' | 'rejected'
  is_active: boolean
  game_types: string[]
  created_at: string
  branches: { name: string; color: string } | null
  question_categories: { name: string; icon: string | null; color: string | null } | null
  answers: { id: string; answer_text: string; is_correct: boolean }[]
}

// ── Constants ──────────────────────────────────────────────────────────────
const GAME_TYPE_OPTIONS = [
  { key: 'quiz',         label: 'Quiz Éclair',        icon: '⚡' },
  { key: 'dungeon',      label: 'Donjon',              icon: '🏰' },
  { key: 'memory',       label: 'Memory',              icon: '🧠' },
  { key: 'speed-sort',   label: 'Speed Sort',          icon: '⚡' },
  { key: 'scenario',     label: 'Scénario',            icon: '🎭' },
  { key: 'detective',    label: 'Le Régulateur',       icon: '⚖️' },
  { key: 'trivia-crack', label: 'Arène du Savoir',     icon: '🏟️' },
  { key: 'platformer',   label: 'Platformer',          icon: '🎮' },
]

// Game → forced question_type mapping
const GAME_TO_QTYPE: Record<string, string> = {
  'quiz':         'mcq',
  'dungeon':      'mcq',
  'platformer':   'mcq',
  'scenario':     'scenario',
  'detective':    'regulation',
  'memory':       'memory_pair',
  'speed-sort':   'sorting',
  'trivia-crack': 'mcq',
}

const QTYPE_OPTIONS = [
  { key: 'mcq',         label: 'Choix multiple (MCQ)' },
  { key: 'scenario',    label: 'Scénario' },
  { key: 'regulation',  label: 'Règlementation' },
  { key: 'sorting',     label: 'Tri / Classement' },
  { key: 'memory_pair', label: 'Paire mémoire' },
]

const DIFF_LABEL = ['', 'Débutant', 'Intermédiaire', 'Expert']
const DIFF_COLOR = ['', '#25C292', '#F59E0B', '#FF4D6A']

const STATUS_META = {
  pending:  { label: 'En attente', color: '#F59E0B', Icon: Clock },
  approved: { label: 'Approuvée',  color: '#25C292', Icon: CheckCircle },
  rejected: { label: 'Rejetée',    color: '#FF4D6A', Icon: XCircle },
}

const EMPTY_ANSWERS: AnswerDraft[] = [
  { answer_text: '', is_correct: true },
  { answer_text: '', is_correct: false },
  { answer_text: '', is_correct: false },
  { answer_text: '', is_correct: false },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function deriveQType(gameTypes: string[]): string {
  // Priority: more specific types win
  for (const g of ['scenario', 'detective', 'memory', 'speed-sort']) {
    if (gameTypes.includes(g)) return GAME_TO_QTYPE[g]
  }
  return 'mcq'
}

function needsCategory(gameTypes: string[]) { return gameTypes.includes('trivia-crack') }
function needsContext(gameTypes: string[])   { return gameTypes.includes('scenario') }

// ── Component ──────────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
  const { user } = useAuth()
  const { addToast } = useUIStore()
  const isAdminPlus = user?.role === 'moderator' || user?.role === 'god'

  const [view, setView] = useState<'list' | 'create'>('list')

  // ── List state ──
  const [questions, setQuestions]   = useState<QuestionRow[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('all')
  const [loadingList, setLoadingList]   = useState(true)

  // ── Form state ──
  const [branches, setBranches]         = useState<Branch[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [branchId, setBranchId]         = useState('')
  const [questionText, setQuestionText] = useState('')
  const [contextText, setContextText]   = useState('')
  const [difficulty, setDifficulty]     = useState<1 | 2 | 3>(1)
  const [gameTypes, setGameTypes]       = useState<string[]>(['quiz'])
  const [questionType, setQuestionType] = useState<string>('mcq')
  const [categoryId, setCategoryId]     = useState('')
  const [explanation, setExplanation]   = useState('')
  const [tip, setTip]                   = useState('')
  const [answers, setAnswers]           = useState<AnswerDraft[]>(EMPTY_ANSWERS.map(a => ({ ...a })))
  const [submitting, setSubmitting]     = useState(false)

  // ── Derived ──
  const showContext  = needsContext(gameTypes)
  const showCategory = needsCategory(gameTypes)
  const contextRequired = showContext

  // Auto-derive question_type from selected game modes
  useEffect(() => {
    setQuestionType(deriveQType(gameTypes))
  }, [gameTypes])

  // Fetch trivia categories when needed
  useEffect(() => {
    if (!showCategory) { setCategoryId(''); return }
    fetch('/api/admin/categories?game_type=trivia-crack')
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories ?? [])
        if (d.categories?.length && !categoryId) setCategoryId(d.categories[0].id)
      })
  }, [showCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = useCallback(async () => {
    setLoadingList(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const res = await fetch(`/api/admin/questions?${params}`)
    const data = await res.json()
    setQuestions(data.questions ?? [])
    setTotal(data.total ?? 0)
    setLoadingList(false)
  }, [page, statusFilter])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => {
      setBranches(d.branches ?? [])
      if (d.branches?.length) setBranchId(d.branches[0].id)
    })
  }, [])

  // ── Handlers ──
  function toggleGameType(key: string) {
    setGameTypes(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    )
  }

  function setCorrectAnswer(idx: number) {
    setAnswers(prev => prev.map((a, i) => ({ ...a, is_correct: i === idx })))
  }

  function updateAnswerText(idx: number, text: string) {
    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, answer_text: text } : a))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!branchId || !questionText.trim() || !explanation.trim()) {
      addToast({ type: 'error', title: 'Champs obligatoires manquants.' }); return
    }
    if (!gameTypes.length) {
      addToast({ type: 'error', title: 'Sélectionne au moins un type de jeu.' }); return
    }
    if (contextRequired && !contextText.trim()) {
      addToast({ type: 'error', title: 'Le contexte est requis pour le type Scénario.' }); return
    }
    if (showCategory && !categoryId) {
      addToast({ type: 'error', title: 'Sélectionne une catégorie pour l\'Arène du Savoir.' }); return
    }

    const filledAnswers = answers.filter(a => a.answer_text.trim())
    if (filledAnswers.length < 2) {
      addToast({ type: 'error', title: 'Au moins 2 réponses requises.' }); return
    }
    if (['mcq', 'scenario', 'regulation'].includes(questionType) && !filledAnswers.some(a => a.is_correct)) {
      addToast({ type: 'error', title: 'Marque la bonne réponse.' }); return
    }

    setSubmitting(true)
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id:     branchId,
        question_text: questionText.trim(),
        context_text:  contextText.trim() || undefined,
        difficulty,
        question_type: questionType,
        game_types:    gameTypes,
        category_id:   showCategory ? categoryId : undefined,
        explanation:   explanation.trim(),
        tip:           tip.trim() || undefined,
        answers:       filledAnswers,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) { addToast({ type: 'error', title: data.error ?? 'Erreur.' }); return }

    addToast({ type: 'success', title: data.message })
    setQuestionText(''); setContextText(''); setExplanation(''); setTip('')
    setAnswers(EMPTY_ANSWERS.map(a => ({ ...a })))
    setView('list')
    fetchQuestions()
  }

  async function handleApprove(id: string, action: 'approve' | 'reject') {
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error }); return }
    addToast({ type: 'success', title: data.message })
    fetchQuestions()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette question définitivement ?')) return
    const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { addToast({ type: 'error', title: data.error }); return }
    addToast({ type: 'success', title: 'Question supprimée.' })
    fetchQuestions()
  }

  const perPage    = 20
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // ── Render ──
  return (
    <div className="page-container">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-white">Questions</h1>
            <p className="text-gray-400 text-sm">
              {isAdminPlus ? 'Créer et approuver les questions' : 'Proposer des questions (en attente d\'approbation)'}
            </p>
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

      {/* ── LIST ────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {isAdminPlus && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => {
                const meta = s !== 'all' ? STATUS_META[s] : null
                return (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={statusFilter === s
                      ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }
                      : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    {meta && <meta.Icon size={11} />}
                    {s === 'all' ? 'Toutes' : meta!.label}
                  </button>
                )
              })}
            </div>
          )}

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
              {questions.map(q => {
                const sm = STATUS_META[q.status] ?? STATUS_META.pending
                return (
                  <div key={q.id} className="rpg-card p-4">
                    <div className="flex items-start gap-3">
                      <sm.Icon size={16} style={{ color: sm.color }} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug line-clamp-2">{q.question_text}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {q.branches && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: `${q.branches.color}15`, color: q.branches.color, border: `1px solid ${q.branches.color}30` }}>
                              {q.branches.name}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${DIFF_COLOR[q.difficulty]}15`, color: DIFF_COLOR[q.difficulty] }}>
                            {DIFF_LABEL[q.difficulty]}
                          </span>
                          {/* Question type badge */}
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(212,168,67,0.1)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.2)' }}>
                            {QTYPE_OPTIONS.find(t => t.key === q.question_type)?.label ?? q.question_type}
                          </span>
                          {/* Category badge (trivia) */}
                          {q.question_categories && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: `${q.question_categories.color ?? '#D4A843'}15`,
                                color: q.question_categories.color ?? '#D4A843',
                                border: `1px solid ${q.question_categories.color ?? '#D4A843'}30`,
                              }}>
                              {q.question_categories.icon} {q.question_categories.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-600">
                            {new Date(q.created_at).toLocaleDateString('fr-CA')}
                          </span>
                        </div>
                      </div>

                      {isAdminPlus && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {q.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(q.id, 'approve')}
                                className="p-1.5 rounded-lg text-[#25C292] hover:bg-[#25C292]/10 transition-all" title="Approuver">
                                <CheckCircle size={15} />
                              </button>
                              <button onClick={() => handleApprove(q.id, 'reject')}
                                className="p-1.5 rounded-lg text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-all" title="Rejeter">
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          {q.status === 'approved' && (
                            <button onClick={() => handleApprove(q.id, 'reject')}
                              className="p-1.5 rounded-lg text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-all" title="Désactiver">
                              <EyeOff size={15} />
                            </button>
                          )}
                          {q.status === 'rejected' && (
                            <button onClick={() => handleApprove(q.id, 'approve')}
                              className="p-1.5 rounded-lg text-[#25C292] hover:bg-[#25C292]/10 transition-all" title="Réapprouver">
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {user?.role === 'god' && (
                            <button onClick={() => handleDelete(q.id)}
                              className="p-1.5 rounded-lg text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-all" title="Supprimer">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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

      {/* ── CREATE FORM ──────────────────────────────────────────────────── */}
      {view === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">

          {/* Branch */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Branche *</label>
            <div className="flex flex-wrap gap-2">
              {branches.map(b => (
                <button type="button" key={b.id} onClick={() => setBranchId(b.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={branchId === b.id
                    ? { background: `${b.color}20`, border: `1px solid ${b.color}50`, color: b.color }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }
                  }>
                  {b.icon} {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Game types */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">
              <Filter size={11} className="inline mr-1.5" />
              Types de jeu *
            </label>
            <div className="flex flex-wrap gap-2">
              {GAME_TYPE_OPTIONS.map(g => (
                <button type="button" key={g.key} onClick={() => toggleGameType(g.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={gameTypes.includes(g.key)
                    ? { background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#6B7280' }
                  }>
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
            {/* Derived question type display */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
              <Tag size={11} className="text-gray-500" />
              <span className="text-xs text-gray-500">Type de question dérivé :</span>
              <span className="text-xs font-semibold text-[#D4A843]">
                {QTYPE_OPTIONS.find(t => t.key === questionType)?.label ?? questionType}
              </span>
            </div>
          </div>

          {/* Category — shown only for trivia-crack */}
          {showCategory && (
            <div className="rpg-card p-5 border border-[#D4A843]/20">
              <label className="block text-xs text-[#D4A843] uppercase tracking-wider mb-3">
                Catégorie Arène du Savoir *
              </label>
              {categories.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune catégorie — créez-en via le panneau Catégories.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button type="button" key={c.id} onClick={() => setCategoryId(c.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={categoryId === c.id
                        ? { background: `${c.color ?? '#D4A843'}20`, border: `1px solid ${c.color ?? '#D4A843'}50`, color: c.color ?? '#D4A843' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }
                      }>
                      {c.icon} {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Question text */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Question *</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Selon la Loi sur les valeurs mobilières, qu'est-ce que..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
              required
            />
          </div>

          {/* Context — shown only when scenario game is selected, and required */}
          {showContext && (
            <div className="rpg-card p-5 border border-[#8B5CF6]/20">
              <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#8B5CF6' }}>
                Contexte du scénario *
                <span className="normal-case text-gray-500 ml-2">(requis pour Scénario)</span>
              </label>
              <textarea
                value={contextText}
                onChange={e => setContextText(e.target.value)}
                rows={3}
                placeholder="Un client de 65 ans, retraité, souhaite investir 50 000$ en..."
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
                required={contextRequired}
              />
            </div>
          )}

          {/* Context (optional) for non-scenario games */}
          {!showContext && (
            <div className="rpg-card p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                Contexte <span className="normal-case text-gray-600">(optionnel)</span>
              </label>
              <textarea
                value={contextText}
                onChange={e => setContextText(e.target.value)}
                rows={2}
                placeholder="Contexte additionnel si nécessaire..."
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
              />
            </div>
          )}

          {/* Answers */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">
              Réponses *{' '}
              {['mcq', 'scenario', 'regulation'].includes(questionType) && (
                <span className="normal-case text-gray-600">(cliquer sur ✓ pour marquer la bonne)</span>
              )}
              {questionType === 'sorting' && (
                <span className="normal-case text-gray-600">(dans l'ordre correct du haut vers le bas)</span>
              )}
              {questionType === 'memory_pair' && (
                <span className="normal-case text-gray-600">(réponses paires — terme / définition)</span>
              )}
            </label>
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  {['mcq', 'scenario', 'regulation'].includes(questionType) && (
                    <button type="button" onClick={() => setCorrectAnswer(i)}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all border"
                      style={a.is_correct
                        ? { background: 'rgba(37,194,146,0.2)', borderColor: '#25C292', color: '#25C292' }
                        : { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#4B5563' }
                      }>
                      ✓
                    </button>
                  )}
                  {questionType === 'sorting' && (
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 text-gray-500">
                      {i + 1}
                    </span>
                  )}
                  {questionType === 'memory_pair' && (
                    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-white/10"
                      style={{ color: i % 2 === 0 ? '#3B82F6' : '#8B5CF6', borderColor: i % 2 === 0 ? '#3B82F620' : '#8B5CF620' }}>
                      {i % 2 === 0 ? 'T' : 'D'}
                    </span>
                  )}
                  <input
                    value={a.answer_text}
                    onChange={e => updateAnswerText(i, e.target.value)}
                    placeholder={
                      questionType === 'sorting'   ? `Item ${i + 1}` :
                      questionType === 'memory_pair' ? (i % 2 === 0 ? `Terme ${Math.floor(i/2)+1}` : `Définition ${Math.floor(i/2)+1}`) :
                      `Réponse ${i + 1}${i >= 2 ? ' (optionnel)' : ''}`
                    }
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none border-b border-white/10 py-1.5 focus:border-white/30 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Difficulté *</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map(d => (
                <button type="button" key={d} onClick={() => setDifficulty(d)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={difficulty === d
                    ? { background: `${DIFF_COLOR[d]}20`, border: `1px solid ${DIFF_COLOR[d]}50`, color: DIFF_COLOR[d] }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }
                  }>
                  {DIFF_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              Explication * <span className="normal-case text-gray-600">(affichée après la réponse)</span>
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={3}
              placeholder="La réponse correcte est... parce que selon l'article..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
              required
            />
          </div>

          {/* Tip */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
              Astuce 💡 <span className="normal-case text-gray-600">(optionnel)</span>
            </label>
            <input
              value={tip}
              onChange={e => setTip(e.target.value)}
              placeholder="Moyen mnémotechnique ou conseil..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 outline-none"
            />
          </div>

          <div className="flex gap-3 pb-6">
            <button type="button" onClick={() => setView('list')}
              className="flex-1 py-3 rounded-lg font-semibold text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
              {submitting ? 'Envoi...' : isAdminPlus ? 'Créer et activer' : 'Soumettre pour approbation'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
