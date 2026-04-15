'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Flag, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw, LayoutGrid } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id: string
  question: string
  context: string | null
  answers: string[]
  correct_answer: string
  branch: string
  category: string
  is_scenario: boolean
}

type Phase = 'loading' | 'exam' | 'confirm' | 'result'
type ReviewFilter = 'all' | 'correct' | 'wrong'

// ── Helpers ────────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExamPage() {
  const router       = useRouter()
  const { slug }     = useParams<{ slug: string }>()
  const searchParams = useSearchParams()

  // Difficulté = paramètre du JEU (nb questions + temps + calcul XP), PAS des questions
  const difficulty = (parseInt(searchParams.get('difficulty') ?? '2') as 1 | 2 | 3)
  const count      = Math.min(50, Math.max(5, parseInt(searchParams.get('count') ?? '30')))
  const duration   = Math.max(10, parseInt(searchParams.get('duration') ?? '45')) * 60

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<Phase>('loading')
  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected]   = useState<(string | null)[]>([])   // texte de la réponse choisie
  const [flagged, setFlagged]     = useState<boolean[]>([])
  const [current, setCurrent]     = useState(0)
  const [timeLeft, setTimeLeft]   = useState(duration)
  const [moduleId, setModuleId]   = useState<string>('')
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [modTitle, setModTitle]   = useState('')
  const [result, setResult]       = useState<{
    score_pct: number; correct: number; total: number
    xp: number; coins: number; levelUp: boolean; passed: boolean
    time_used: number
  } | null>(null)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [navOpen, setNavOpen]     = useState(false)

  const startTimeRef = useRef(Date.now())
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load questions ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/game/questions?count=${count}`).then(r => r.json()),
      fetch(`/api/modules/${slug}`).then(r => r.json()),
      fetch('/api/modules').then(r => r.json()),
    ]).then(([qData, modData, listData]) => {
      const qs: Question[] = qData.questions ?? []
      if (!qs.length) { router.push(`/modules/${slug}`); return }
      setQuestions(qs)
      setSelected(new Array(qs.length).fill(null))
      setFlagged(new Array(qs.length).fill(false))
      setModuleId(modData.module?.id ?? '')
      setModTitle(modData.module?.title ?? 'Examen')
      if (listData.branch_color) setBranchColor(listData.branch_color)
      startTimeRef.current = Date.now()
      setPhase('exam')
    })
  }, [slug, count, router])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitExam = useCallback(async (forced = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('result')

    const timeUsed  = Math.round((Date.now() - startTimeRef.current) / 1000)
    const correct   = questions.filter((q, i) => selected[i] === q.correct_answer).length
    const total     = questions.length
    const score_pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const passed    = score_pct >= 60
    const timeBonusPct = forced ? 0 : Math.max(0, 1 - timeUsed / duration)

    if (moduleId) {
      await fetch('/api/exam/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          score_pct,
          questions_total: total,
          correct_answers: correct,
          time_spent_seconds: timeUsed,
        }),
      })
    }

    const gameRes = await fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type:          'exam',
        score:              score_pct,
        questions_total:    total,
        questions_correct:  correct,
        best_streak:        0,
        avg_time_seconds:   total > 0 ? timeUsed / total : 30,
        difficulty,
        time_bonus_pct:     timeBonusPct,
      }),
    }).then(r => r.json())

    setResult({
      score_pct, correct, total, passed, time_used: timeUsed,
      xp:      gameRes.xp_earned    ?? 0,
      coins:   gameRes.coins_earned  ?? 0,
      levelUp: gameRes.level_up      ?? false,
    })
  }, [questions, selected, moduleId, duration, difficulty])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { submitExam(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, submitExam])

  // ── Interaction ────────────────────────────────────────────────────────────
  function selectAnswer(text: string) {
    if (phase !== 'exam') return
    setSelected(prev => { const n = [...prev]; n[current] = text; return n })
  }

  function toggleFlag() {
    setFlagged(prev => { const n = [...prev]; n[current] = !n[current]; return n })
  }

  function goTo(i: number) { setCurrent(i); setNavOpen(false) }

  const answered    = selected.filter(s => s !== null).length
  const allAnswered = answered === questions.length
  const timePct     = (timeLeft / duration) * 100
  const timerColor  = timePct > 40 ? branchColor : timePct > 15 ? '#F59E0B' : '#FF4D6A'
  const q           = questions[current]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading' || !q) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">📋</div>
          <p className="font-cinzel text-sm tracking-widest text-gray-500">Préparation de l'examen…</p>
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const filteredIndexes = questions
      .map((_, i) => i)
      .filter(i => {
        const isCorrect = selected[i] === questions[i].correct_answer
        if (reviewFilter === 'correct') return isCorrect
        if (reviewFilter === 'wrong')   return !isCorrect
        return true
      })

    return (
      <div className="page-container max-w-2xl mx-auto space-y-6">

        {/* Score card */}
        <div className="rpg-card p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 0%, ${result.passed ? 'rgba(37,194,146,0.07)' : 'rgba(255,77,106,0.07)'} 0%, transparent 70%)` }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-cinzel font-bold text-sm mb-5"
              style={result.passed
                ? { background: 'rgba(37,194,146,0.15)', color: '#25C292', border: '1px solid rgba(37,194,146,0.3)' }
                : { background: 'rgba(255,77,106,0.15)', color: '#FF4D6A', border: '1px solid rgba(255,77,106,0.3)' }}>
              {result.passed ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {result.passed ? 'RÉUSSI' : 'ÉCHOUÉ'}
            </div>

            <div className="font-cinzel font-black text-6xl mb-1"
              style={{ color: result.passed ? '#25C292' : '#FF4D6A' }}>
              {result.score_pct}%
            </div>
            <p className="text-gray-400 text-sm mb-6">
              {result.correct} / {result.total} bonnes réponses · {fmtTime(result.time_used)} utilisées
            </p>

            {result.levelUp && (
              <div className="mb-4 p-3 rounded-xl font-cinzel font-bold text-sm animate-pulse"
                style={{ background: `${branchColor}12`, color: branchColor }}>
                🎉 NIVEAU SUPÉRIEUR ATTEINT !
              </div>
            )}

            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="font-cinzel font-bold text-xl" style={{ color: branchColor }}>+{result.xp}</p>
                <p className="text-gray-600 text-xs uppercase tracking-wider">XP</p>
              </div>
              <div className="text-center">
                <p className="font-cinzel font-bold text-xl text-[#D4A843]">+{result.coins}</p>
                <p className="text-gray-600 text-xs uppercase tracking-wider">Coins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Review */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-cinzel font-bold text-white text-sm tracking-wide">Révision des questions</h2>
            <div className="flex gap-1">
              {(['all', 'correct', 'wrong'] as ReviewFilter[]).map(f => (
                <button key={f} onClick={() => setReviewFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={reviewFilter === f
                    ? { background: `${branchColor}18`, color: branchColor, border: `1px solid ${branchColor}30` }
                    : { color: '#6B7280', border: '1px solid transparent' }}>
                  {f === 'all' ? 'Tout' : f === 'correct' ? '✓ Justes' : '✗ Faux'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredIndexes.map(i => {
              const question  = questions[i]
              const userAns   = selected[i]
              const isOk      = userAns === question.correct_answer

              return (
                <div key={question.id} className="rpg-card p-4 space-y-3"
                  style={{ borderColor: isOk ? 'rgba(37,194,146,0.2)' : 'rgba(255,77,106,0.2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isOk
                        ? <CheckCircle size={16} style={{ color: '#25C292' }} />
                        : <XCircle    size={16} style={{ color: '#FF4D6A' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-500 text-xs mb-1">Q{i + 1}</p>
                      {question.context && (
                        <p className="text-gray-500 text-xs italic mb-1 leading-relaxed">{question.context}</p>
                      )}
                      <p className="text-white text-sm leading-relaxed">{question.question}</p>
                    </div>
                  </div>

                  <div className="pl-7 space-y-1.5 text-xs">
                    {!isOk && (
                      <p style={{ color: '#FF4D6A' }}>
                        Ta réponse : {userAns ?? <em>Sans réponse</em>}
                      </p>
                    )}
                    <p style={{ color: '#25C292' }}>
                      {isOk ? '✓ ' : 'Bonne réponse : '}{question.correct_answer}
                    </p>
                  </div>
                </div>
              )
            })}
            {filteredIndexes.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">Aucune question dans ce filtre.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => router.push(`/modules/${slug}`)}
            className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}bb)`, color: '#080A12' }}>
            <RotateCcw size={15} /> Retenter
          </button>
          <button
            onClick={() => router.push('/modules')}
            className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all">
            Modules
          </button>
        </div>
      </div>
    )
  }

  // ── Exam UI ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#080A12]">

      {/* Top bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3"
        style={{ background: '#0a0e1a' }}>
        <span className="font-cinzel font-bold text-white text-sm hidden sm:block truncate max-w-[160px]">
          {modTitle}
        </span>
        <div className="flex-1" />
        <span className="text-gray-400 text-sm">
          <strong className="text-white">{current + 1}</strong>/{questions.length}
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: `${timerColor}12`, border: `1px solid ${timerColor}30` }}>
          <Clock size={13} style={{ color: timerColor }} />
          <span className="font-cinzel font-bold text-sm tabular-nums" style={{ color: timerColor }}>
            {fmtTime(timeLeft)}
          </span>
        </div>
        <button onClick={() => setNavOpen(v => !v)}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* Question navigator overlay */}
      {navOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rpg-card p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel font-bold text-white text-sm">Navigation</h3>
              <span className="text-gray-500 text-xs">{answered}/{questions.length} répondues</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => {
                const isAnswered = selected[i] !== null
                const isFlagged  = flagged[i]
                const isCurrent  = i === current
                return (
                  <button key={i} onClick={() => goTo(i)}
                    className="w-9 h-9 rounded-lg text-xs font-bold transition-all"
                    style={{
                      border: isCurrent ? `2px solid ${branchColor}` : '1px solid transparent',
                      background: isFlagged
                        ? 'rgba(245,158,11,0.2)'
                        : isAnswered
                          ? `${branchColor}20`
                          : 'rgba(255,255,255,0.05)',
                      color: isFlagged ? '#F59E0B' : isAnswered ? branchColor : '#6B7280',
                    }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background: `${branchColor}20` }} /> Répondue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background: 'rgba(245,158,11,0.2)' }} /> Marquée
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex-shrink-0 px-4 py-2 flex gap-0.5 overflow-x-auto"
        style={{ background: '#09101f' }}>
        {questions.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className="flex-shrink-0 h-1.5 rounded-full transition-all"
            style={{
              width: i === current ? 20 : 8,
              background: flagged[i]
                ? '#F59E0B'
                : selected[i] !== null
                  ? branchColor
                  : i === current
                    ? `${branchColor}60`
                    : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Question body */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-xs font-medium tracking-wider">Q{current + 1}</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(77,139,255,0.08)', color: '#4D8BFF', border: '1px solid rgba(77,139,255,0.15)' }}>
              {q.category}
            </span>
            {flagged[current] && (
              <span className="text-xs text-yellow-500 flex items-center gap-1">
                <Flag size={10} /> Marquée
              </span>
            )}
          </div>

          {/* Context (scénario) */}
          {q.context && (
            <div className="p-4 rounded-xl text-sm text-gray-300 leading-relaxed"
              style={{ background: 'rgba(139,92,246,0.06)', borderLeft: `3px solid rgba(139,92,246,0.4)` }}>
              {q.context}
            </div>
          )}

          {/* Question */}
          <p className="text-white text-base leading-relaxed font-medium">{q.question}</p>

          {/* Answers */}
          <div className="space-y-2.5">
            {q.answers.map((ans, ai) => {
              const isSelected = selected[current] === ans
              const letter     = String.fromCharCode(65 + ai)
              return (
                <button key={ai} onClick={() => selectAnswer(ans)}
                  className="w-full text-left rounded-xl p-4 transition-all flex items-center gap-3"
                  style={{
                    background: isSelected ? `${branchColor}15` : 'rgba(255,255,255,0.035)',
                    border: isSelected
                      ? `1.5px solid ${branchColor}50`
                      : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: isSelected ? `0 0 0 1px ${branchColor}20` : undefined,
                  }}>
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isSelected ? branchColor : 'rgba(255,255,255,0.07)',
                      color: isSelected ? '#080A12' : '#9CA3AF',
                    }}>
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: isSelected ? '#fff' : '#d1d5db' }}>
                    {ans}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-3 flex items-center gap-3"
        style={{ background: '#0a0e1a' }}>
        <button onClick={toggleFlag}
          className="p-2.5 rounded-lg transition-all flex-shrink-0"
          style={flagged[current]
            ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }
            : { color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Flag size={15} />
        </button>

        <button onClick={() => current > 0 && goTo(current - 1)} disabled={current === 0}
          className="p-2.5 rounded-lg border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => current < questions.length - 1 && goTo(current + 1)} disabled={current === questions.length - 1}
          className="p-2.5 rounded-lg border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30">
          <ChevronRight size={16} />
        </button>

        <div className="flex-1" />

        {phase === 'confirm' ? (
          <div className="flex items-center gap-2">
            <span className="text-yellow-500 text-xs flex items-center gap-1">
              <AlertTriangle size={12} /> Confirmer ?
            </span>
            <button onClick={() => setPhase('exam')}
              className="px-3 py-2 rounded-lg text-xs border border-white/10 text-gray-400 hover:text-white transition-colors">
              Non
            </button>
            <button onClick={() => submitExam(false)}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}bb)`, color: '#080A12' }}>
              Soumettre
            </button>
          </div>
        ) : (
          <button
            onClick={() => !allAnswered ? setPhase('confirm') : submitExam(false)}
            className="px-4 py-2 rounded-lg text-sm font-cinzel font-bold tracking-wider transition-all flex items-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${branchColor}, ${branchColor}bb)`,
              color: '#080A12',
              boxShadow: `0 0 16px ${branchColor}25`,
            }}>
            {!allAnswered && (
              <span className="text-xs opacity-70 mr-0.5">{answered}/{questions.length}</span>
            )}
            SOUMETTRE
          </button>
        )}
      </div>
    </div>
  )
}
