'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Question { id: string; question: string; context: string | null; answers: string[]; correct_answer: string }
type Phase = 'playing' | 'answer' | 'result'

export default function ScenarioPage() {
  const [phase, setPhase] = useState<Phase>('playing')
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/character').then(r => r.json()),
      fetch('/api/game/questions?scenario=true&count=5').then(r => r.json()),
    ]).then(([charData, qData]) => {
      if (charData.branch?.color) setBranchColor(charData.branch.color)
      if (qData.questions) setQuestions(qData.questions)
      setLoading(false)
    })
  }, [])

  function handleAnswer(answer: string) {
    setSelectedAnswer(answer)
    if (answer === questions[qIndex].correct_answer) setCorrect(c => c + 1)
    setPhase('answer')
  }

  function next() {
    if (qIndex + 1 >= questions.length) {
      submitResult()
    } else {
      setQIndex(i => i + 1)
      setSelectedAnswer(null)
      setPhase('playing')
    }
  }

  async function submitResult() {
    const score = Math.round((correct / questions.length) * 100)
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'scenario', score, questions_total: questions.length, questions_correct: correct, best_streak: 0, avg_time_seconds: 30, difficulty: 2 }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
  }

  const q = questions[qIndex]

  if (loading) return (
    <GameShell title="Scénario Client" icon="👔">
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 animate-pulse">Chargement du scénario...</p>
      </div>
    </GameShell>
  )

  if (!questions.length) return (
    <GameShell title="Scénario Client" icon="👔">
      <div className="max-w-md mx-auto rpg-card p-8 text-center">
        <p className="text-gray-400">Aucun scénario disponible pour le moment.</p>
      </div>
    </GameShell>
  )

  if (result) return (
    <GameShell title="Scénario Client" icon="👔" branchColor={branchColor}>
      <ResultScreen score={Math.round((correct/questions.length)*100)} correct={correct} total={questions.length}
        xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
        bonusBreakdown={result.breakdown} rankUpReward={result.rankUp}
        branchColor={branchColor}
        onReplay={() => { setQIndex(0); setCorrect(0); setSelectedAnswer(null); setResult(null); setPhase('playing') }}
        gameLabel="Scénario Client" />
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )

  return (
    <GameShell title="Scénario Client" icon="👔" branchColor={branchColor}>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span>Scénario {qIndex + 1}/{questions.length}</span>
          <span style={{ color: branchColor }}>Conseiller en exercice</span>
        </div>

        {/* Client dossier */}
        {q.context && (
          <div className="rpg-card p-5 mb-4 border-l-4" style={{ borderLeftColor: branchColor }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">📋 Dossier client</p>
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{q.context}</p>
          </div>
        )}

        {/* Question */}
        <div className="rpg-card p-5 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">💬 Situation</p>
          <p className="text-white font-medium leading-relaxed">{q.question}</p>
        </div>

        {/* Answers */}
        <div className="space-y-3 mb-5">
          {q.answers.map((a, i) => {
            const isSelected = selectedAnswer === a
            const isCorrect = a === q.correct_answer
            const revealed = phase === 'answer'
            const state = revealed
              ? isCorrect ? 'correct' : isSelected ? 'wrong' : 'dim'
              : 'idle'
            const colors = {
              idle: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#fff' },
              correct: { bg: 'rgba(37,194,146,0.12)', border: '#25C292', text: '#25C292' },
              wrong: { bg: 'rgba(255,77,106,0.12)', border: '#FF4D6A', text: '#FF4D6A' },
              dim: { bg: 'rgba(255,255,255,0.01)', border: 'rgba(255,255,255,0.04)', text: '#374151' },
            }[state]

            return (
              <button key={i} onClick={() => phase === 'playing' && handleAnswer(a)} disabled={phase !== 'playing'}
                className="w-full text-left px-5 py-4 rounded-xl transition-all duration-200 disabled:cursor-default"
                style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                <span className="text-xs mr-3 opacity-50">{String.fromCharCode(65 + i)}.</span>
                {a}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {phase === 'answer' && (
          <div className="rpg-card p-5 mb-5 animate-slide-up" style={{ borderColor: selectedAnswer === q.correct_answer ? '#25C29250' : '#FF4D6A50' }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              {selectedAnswer === q.correct_answer ? '✓ Bonne réponse' : '✗ Mauvaise réponse'}
            </p>
            {selectedAnswer !== q.correct_answer && (
              <p className="text-gray-400 text-xs mb-2">Bonne réponse : <span className="text-green-400">{q.correct_answer}</span></p>
            )}
            <button onClick={next} className="mt-4 px-6 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{ background: `${branchColor}20`, border: `1px solid ${branchColor}40`, color: branchColor }}>
              {qIndex + 1 >= questions.length ? 'Voir les résultats →' : 'Scénario suivant →'}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  )
}
