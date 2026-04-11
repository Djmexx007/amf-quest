'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, Trophy, Clock, Target, Play, AlertCircle } from 'lucide-react'

interface Module {
  id: string; slug: string; title: string; description: string
  icon: string; unlock_level: number
}

interface Progress {
  best_score: number; questions_answered: number
  correct_answers: number; time_spent_seconds: number
  last_activity_at: string | null
}

interface Config {
  label: string; questions: number; duration: number; difficulty: 1 | 2 | 3
  color: string; description: string
}

const CONFIGS: Config[] = [
  { label: 'Débutant',      questions: 20, duration: 30, difficulty: 1, color: '#25C292', description: '20 questions · 30 min · Difficulté facile' },
  { label: 'Intermédiaire', questions: 30, duration: 45, difficulty: 2, color: '#F59E0B', description: '30 questions · 45 min · Difficulté moyenne' },
  { label: 'Expert',        questions: 40, duration: 60, difficulty: 3, color: '#FF4D6A', description: '40 questions · 60 min · Difficulté élevée' },
]

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ModuleDetailPage() {
  const router   = useRouter()
  const { slug } = useParams<{ slug: string }>()

  const [mod, setMod]       = useState<Module | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [qCount, setQCount] = useState(0)
  const [level, setLevel]   = useState(1)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [loading, setLoading] = useState(true)
  const [chosen, setChosen] = useState<0 | 1 | 2>(1)

  useEffect(() => {
    Promise.all([
      fetch(`/api/modules/${slug}`).then(r => r.json()),
      fetch('/api/modules').then(r => r.json()),
    ]).then(([detail, list]) => {
      setMod(detail.module ?? null)
      setProgress(detail.progress ?? null)
      setQCount(detail.question_count ?? 0)
      setLevel(detail.character_level ?? 1)
      if (list.branch_color) setBranchColor(list.branch_color)
    }).finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-5xl animate-bounce">📋</div>
      </div>
    )
  }

  if (!mod) {
    return (
      <div className="page-container">
        <p className="text-gray-400">Module introuvable.</p>
      </div>
    )
  }

  const cfg = CONFIGS[chosen]
  const canStart = qCount >= cfg.questions

  return (
    <div className="page-container max-w-2xl mx-auto space-y-6">

      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/modules')}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <BookOpen size={18} style={{ color: branchColor }} />
        <span className="text-gray-400 text-sm">Modules</span>
      </div>

      {/* Module header */}
      <div className="rpg-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background: `${branchColor}12`, border: `1px solid ${branchColor}20` }}>
          {mod.icon}
        </div>
        <div>
          <h1 className="font-cinzel text-xl font-bold text-white">{mod.title}</h1>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{mod.description}</p>
        </div>
      </div>

      {/* Stats */}
      {progress && progress.questions_answered > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Trophy size={15} />, label: 'Meilleur score', value: `${progress.best_score}%`,
              color: progress.best_score >= 60 ? '#25C292' : '#F59E0B' },
            { icon: <Target size={15} />, label: 'Questions répondues', value: String(progress.questions_answered), color: branchColor },
            { icon: <Clock size={15} />, label: 'Temps total', value: fmt(progress.time_spent_seconds ?? 0), color: '#4D8BFF' },
          ].map(s => (
            <div key={s.label} className="rpg-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color: s.color }}>
                {s.icon}
                <span className="font-bold text-base">{s.value}</span>
              </div>
              <p className="text-gray-600 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Exam rules */}
      <div className="rpg-card p-5 space-y-3">
        <h2 className="font-cinzel font-bold text-white text-sm tracking-wide flex items-center gap-2">
          <AlertCircle size={15} style={{ color: branchColor }} />
          Conditions d'examen
        </h2>
        <ul className="space-y-2 text-gray-400 text-sm">
          {[
            'Aucun feedback pendant l\'examen — résultats uniquement à la soumission',
            'Navigue librement entre les questions, marque celles à revoir',
            'L\'examen se termine automatiquement à la fin du chrono',
            'Seuil de réussite : 60 % de bonnes réponses',
            'Révision complète avec explications après chaque tentative',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-gray-600 mt-0.5 flex-shrink-0">—</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Difficulty selector */}
      <div className="space-y-3">
        <h2 className="font-cinzel font-bold text-white text-sm tracking-wide">Choisir la difficulté</h2>
        <div className="grid grid-cols-3 gap-3">
          {CONFIGS.map((c, i) => (
            <button key={c.label} onClick={() => setChosen(i as 0 | 1 | 2)}
              className="rpg-card p-4 text-center transition-all"
              style={chosen === i ? { borderColor: `${c.color}50`, background: `${c.color}0a` } : {}}>
              <p className="font-cinzel font-bold text-sm mb-1" style={{ color: chosen === i ? c.color : '#9CA3AF' }}>
                {c.label}
              </p>
              <p className="text-gray-600 text-xs leading-relaxed">{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* No questions warning */}
      {!canStart && (
        <div className="rounded-xl px-4 py-3 text-sm text-yellow-600"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          Pas assez de questions disponibles pour ce niveau ({qCount}/{cfg.questions} requises).
        </div>
      )}

      {/* Start button */}
      <button
        disabled={!canStart || level < mod.unlock_level}
        onClick={() => router.push(`/modules/${slug}/exam?difficulty=${cfg.difficulty}&count=${cfg.questions}&duration=${cfg.duration}`)}
        className="w-full py-4 rounded-xl font-cinzel font-bold text-base tracking-widest transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-3"
        style={{
          background: canStart ? `linear-gradient(135deg, ${branchColor}, ${branchColor}bb)` : undefined,
          color: '#080A12',
          boxShadow: canStart ? `0 4px 24px ${branchColor}30` : undefined,
        }}
      >
        <Play size={18} />
        COMMENCER L'EXAMEN
      </button>

    </div>
  )
}
