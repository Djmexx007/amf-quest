'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, BookOpen, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'

interface Branch { id: string; name: string; color: string; icon: string }
interface Answer { answer_text: string; is_correct: boolean }
interface QuestionRow {
  id: string
  question_text: string
  difficulty: 1 | 2 | 3
  is_active: boolean
  created_at: string
  branches: { name: string; color: string } | null
  answers: { id: string; answer_text: string; is_correct: boolean }[]
}

const GAME_TYPE_OPTIONS = [
  { key: 'quiz',        label: 'Quiz Éclair' },
  { key: 'dungeon',     label: 'Donjon' },
  { key: 'memory',      label: 'Memory' },
  { key: 'speed-sort',  label: 'Speed Sort' },
  { key: 'scenario',    label: 'Scénario' },
  { key: 'detective',   label: 'Le Régulateur' },
  { key: 'trivia-crack',label: 'Trivia Crack' },
  { key: 'platformer',  label: 'Platformer' },
]

const DIFF_LABEL = ['', 'Débutant', 'Intermédiaire', 'Expert']
const DIFF_COLOR = ['', '#25C292', '#F59E0B', '#FF4D6A']

const EMPTY_ANSWERS: Answer[] = [
  { answer_text: '', is_correct: true },
  { answer_text: '', is_correct: false },
  { answer_text: '', is_correct: false },
  { answer_text: '', is_correct: false },
]

export default function AdminQuestionsPage() {
  const { user } = useAuth()
  const { addToast } = useUIStore()
  const isAdminPlus = user?.role === 'admin' || user?.role === 'god'

  const [view, setView] = useState<'list' | 'create'>('list')
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'all'>('all')
  const [loadingList, setLoadingList] = useState(true)

  // Form state
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [contextText, setContextText] = useState('')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1)
  const [gameTypes, setGameTypes] = useState<string[]>(['quiz'])
  const [explanation, setExplanation] = useState('')
  const [tip, setTip] = useState('')
  const [answers, setAnswers] = useState<Answer[]>(EMPTY_ANSWERS.map(a => ({ ...a })))
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => {
      setBranches(d.branches ?? [])
      if (d.branches?.length) setBranchId(d.branches[0].id)
    })
  }, [])

  function toggleGameType(key: string) {
    setGameTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
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
      addToast({ type: 'error', title: 'Champs obligatoires manquants.' })
      return
    }
    if (!gameTypes.length) {
      addToast({ type: 'error', title: 'Sélectionne au moins un type de jeu.' })
      return
    }
    const filledAnswers = answers.filter(a => a.answer_text.trim())
    if (filledAnswers.length < 2) {
      addToast({ type: 'error', title: 'Au moins 2 réponses requises.' })
      return
    }
    if (!filledAnswers.some(a => a.is_correct)) {
      addToast({ type: 'error', title: 'Marque la bonne réponse.' })
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch_id: branchId,
        question_text: questionText.trim(),
        context_text: contextText.trim() || undefined,
        difficulty,
        game_types: gameTypes,
        explanation: explanation.trim(),
        tip: tip.trim() || undefined,
        answers: filledAnswers,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      addToast({ type: 'error', title: data.error ?? 'Erreur.' })
      return
    }

    addToast({ type: 'success', title: data.message })
    setQuestionText('')
    setContextText('')
    setExplanation('')
    setTip('')
    setAnswers(EMPTY_ANSWERS.map(a => ({ ...a })))
    setView('list')
    fetchQuestions()
  }

  async function handleApprove(id: string, approve: boolean) {
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: approve ? 'approve' : 'reject' }),
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

  const perPage = 20
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
          style={{ background: view === 'create' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #D4A843, #B8892A)', color: view === 'create' ? '#9CA3AF' : '#080A12' }}
        >
          <Plus size={14} />
          {view === 'create' ? 'Voir la liste' : 'Nouvelle question'}
        </button>
      </div>

      {/* ── LIST ── */}
      {view === 'list' && (
        <>
          {/* Filters */}
          {isAdminPlus && (
            <div className="flex gap-2 mb-4">
              {(['all', 'pending', 'active'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={statusFilter === s
                    ? { background: 'rgba(212,168,67,0.15)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.3)' }
                    : { background: 'rgba(255,255,255,0.03)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  {s === 'all' ? 'Toutes' : s === 'pending' ? 'En attente' : 'Actives'}
                </button>
              ))}
            </div>
          )}

          {loadingList ? (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          ) : questions.length === 0 ? (
            <div className="rpg-card p-10 text-center">
              <p className="text-gray-500 mb-3">Aucune question trouvée.</p>
              <button onClick={() => setView('create')}
                className="text-[#D4A843] text-sm hover:underline">
                + Créer la première question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className="rpg-card p-4">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {q.is_active
                        ? <CheckCircle size={16} className="text-[#25C292]" />
                        : <Clock size={16} className="text-[#F59E0B]" />}
                    </div>

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
                        <span className="text-xs text-gray-600">
                          {new Date(q.created_at).toLocaleDateString('fr-CA')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {isAdminPlus && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!q.is_active && (
                          <button onClick={() => handleApprove(q.id, true)}
                            className="p-1.5 rounded-lg text-[#25C292] hover:bg-[#25C292]/10 transition-all" title="Approuver">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {q.is_active && (
                          <button onClick={() => handleApprove(q.id, false)}
                            className="p-1.5 rounded-lg text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-all" title="Désactiver">
                            <EyeOff size={15} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(q.id)}
                          className="p-1.5 rounded-lg text-[#FF4D6A] hover:bg-[#FF4D6A]/10 transition-all" title="Supprimer">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
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

      {/* ── CREATE FORM ── */}
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

          {/* Context (optional) */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Contexte <span className="normal-case text-gray-600">(optionnel)</span></label>
            <textarea
              value={contextText}
              onChange={e => setContextText(e.target.value)}
              rows={2}
              placeholder="Un client souhaite investir 50 000$ en..."
              className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none outline-none"
            />
          </div>

          {/* Answers */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Réponses * <span className="normal-case text-gray-600">(cliquer sur ✓ pour marquer la bonne)</span></label>
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setCorrectAnswer(i)}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all border"
                    style={a.is_correct
                      ? { background: 'rgba(37,194,146,0.2)', borderColor: '#25C292', color: '#25C292' }
                      : { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#4B5563' }
                    }>
                    ✓
                  </button>
                  <input
                    value={a.answer_text}
                    onChange={e => updateAnswerText(i, e.target.value)}
                    placeholder={`Réponse ${i + 1}${i >= 2 ? ' (optionnel)' : ''}`}
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

          {/* Game types */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-3">Types de jeu *</label>
            <div className="flex flex-wrap gap-2">
              {GAME_TYPE_OPTIONS.map(g => (
                <button type="button" key={g.key} onClick={() => toggleGameType(g.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={gameTypes.includes(g.key)
                    ? { background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#6B7280' }
                  }>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="rpg-card p-5">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Explication * <span className="normal-case text-gray-600">(affichée après la réponse)</span></label>
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
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Astuce 💡 <span className="normal-case text-gray-600">(optionnel)</span></label>
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
