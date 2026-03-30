'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import ProgressBar from '@/components/ui/ProgressBar'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'
import { useAuth } from '@/hooks/useAuth'
import { Timer, Zap } from 'lucide-react'

interface Answer { id: string; answer_text: string; is_correct: boolean }
interface Question {
  id: string; question_text: string; context_text: string | null
  icon: string; difficulty: number; explanation: string; tip: string | null
  answers: Answer[]
}

type Phase = 'config' | 'playing' | 'result'
type AnswerState = 'idle' | 'correct' | 'wrong'

const DIFFICULTY_LABELS = ['', 'Débutant', 'Intermédiaire', 'Expert']
const DIFFICULTY_COLORS = ['', '#25C292', '#F59E0B', '#FF4D6A']
const TIME_PER_Q = [0, 20, 18, 12] // seconds per question by difficulty

export default function QuizPage() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('config')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(20)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; newLevel?: number } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [branchColor, setBranchColor] = useState('#D4A843')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
  }, [])

  async function startGame() {
    const res = await fetch(`/api/game/questions?game=quiz&count=10&difficulty=${difficulty}`)
    const data = await res.json()
    if (!data.questions?.length) { alert('Aucune question disponible. Ajoute du contenu d\'abord.'); return }
    setQuestions(data.questions)
    setQIndex(0); setScore(0); setCorrect(0); setStreak(0); setBestStreak(0)
    setTimeLeft(TIME_PER_Q[difficulty]); setAnswerState('idle'); setSelectedId(null); setCorrectId(null)
    startTimeRef.current = Date.now()
    setPhase('playing')
  }

  const advanceQuestion = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        finishGame()
      } else {
        setQIndex(i => i + 1)
        setTimeLeft(TIME_PER_Q[difficulty])
        setAnswerState('idle'); setSelectedId(null); setCorrectId(null)
      }
    }, 1400)
  }, [qIndex, questions.length, difficulty])

  const handleTimeout = useCallback(() => {
    if (answerState !== 'idle') return
    const cAnswer = questions[qIndex]?.answers.find(a => a.is_correct)
    setCorrectId(cAnswer?.id ?? null)
    setAnswerState('wrong')
    setStreak(0)
    advanceQuestion()
  }, [answerState, questions, qIndex, advanceQuestion])

  useEffect(() => {
    if (phase !== 'playing' || answerState !== 'idle') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleTimeout(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, qIndex, answerState, handleTimeout])

  function handleAnswer(answer: Answer) {
    if (answerState !== 'idle') return
    if (timerRef.current) clearInterval(timerRef.current)

    setSelectedId(answer.id)
    const cAnswer = questions[qIndex].answers.find(a => a.is_correct)
    setCorrectId(cAnswer?.id ?? null)

    if (answer.is_correct) {
      const timeBonus = Math.round((timeLeft / TIME_PER_Q[difficulty]) * 50)
      const streakBonus = streak >= 3 ? Math.round(streak * 5) : 0
      const pts = 100 + timeBonus + streakBonus
      setScore(s => s + pts)
      setCorrect(c => c + 1)
      const newStreak = streak + 1
      setStreak(newStreak)
      setBestStreak(bs => Math.max(bs, newStreak))
      setAnswerState('correct')
    } else {
      setStreak(0)
      setAnswerState('wrong')
    }
    advanceQuestion()
  }

  async function finishGame() {
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    setTotalTime(elapsed)
    const timeBonusPct = Math.max(0, 1 - elapsed / (questions.length * TIME_PER_Q[difficulty]))
    const res = await fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'quiz', score, questions_total: questions.length,
        questions_correct: correct, best_streak: bestStreak,
        avg_time_seconds: elapsed / questions.length,
        difficulty, time_bonus_pct: timeBonusPct,
      }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, newLevel: data.new_level })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  const q = questions[qIndex]
  const timePct = (timeLeft / TIME_PER_Q[difficulty]) * 100
  const timerColor = timePct > 50 ? branchColor : timePct > 25 ? '#F59E0B' : '#FF4D6A'

  return (
    <>
    {unlockedAchievements.length > 0 && (
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    )}
    <GameShell title="Quiz Éclair" icon="⚡" branchColor={branchColor}>
      {phase === 'config' && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-8 text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="font-cinzel text-xl font-bold text-white mb-2">Quiz Éclair</h2>
            <p className="text-gray-400 text-sm mb-8">10 questions chronométrées. Bonus de vitesse et de série.</p>

            <div className="mb-8">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Difficulté</p>
              <div className="flex gap-3">
                {([1, 2, 3] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      background: difficulty === d ? `${DIFFICULTY_COLORS[d]}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${difficulty === d ? DIFFICULTY_COLORS[d] : 'rgba(255,255,255,0.08)'}`,
                      color: difficulty === d ? DIFFICULTY_COLORS[d] : '#9CA3AF',
                    }}>
                    {DIFFICULTY_LABELS[d]}
                    <div className="text-xs mt-0.5 opacity-70">{TIME_PER_Q[d]}s/q</div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startGame}
              className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all"
              style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12', boxShadow: `0 0 20px ${branchColor}30` }}>
              Commencer
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && q && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          {/* Progress + timer */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Question {qIndex + 1}/{questions.length}</span>
                <span className="flex items-center gap-1" style={{ color: branchColor }}>
                  <Zap size={11} /> {score} pts · 🔥{streak}
                </span>
              </div>
              <ProgressBar value={qIndex + 1} max={questions.length} color={branchColor} height={6} />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0" style={{ color: timerColor }}>
              <Timer size={16} />
              <span className="font-cinzel font-bold text-lg w-8 text-right">{timeLeft}</span>
            </div>
          </div>
          <div className="mb-2">
            <ProgressBar value={timePct} max={100} color={timerColor} height={3} animated={false} />
          </div>

          {/* Question card */}
          <div className="rpg-card p-6 mb-5">
            {q.context_text && (
              <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm italic">
                {q.context_text}
              </div>
            )}
            <p className="text-white text-lg font-medium leading-relaxed">{q.question_text}</p>
          </div>

          {/* Answers */}
          <div className="grid grid-cols-1 gap-3">
            {q.answers.map(answer => {
              const isSelected = selectedId === answer.id
              const isCorrect = correctId === answer.id
              const state = answerState !== 'idle'
                ? isCorrect ? 'correct' : isSelected ? 'wrong' : 'dim'
                : 'idle'

              const styles: Record<string, { bg: string; border: string; color: string }> = {
                idle: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.10)', color: '#fff' },
                correct: { bg: 'rgba(37,194,146,0.15)', border: '#25C292', color: '#25C292' },
                wrong: { bg: 'rgba(255,77,106,0.15)', border: '#FF4D6A', color: '#FF4D6A' },
                dim: { bg: 'rgba(255,255,255,0.01)', border: 'rgba(255,255,255,0.04)', color: '#4B5563' },
              }
              const s = styles[state]

              return (
                <button key={answer.id} onClick={() => handleAnswer(answer)}
                  disabled={answerState !== 'idle'}
                  className="w-full text-left px-5 py-4 rounded-xl font-medium transition-all duration-200 disabled:cursor-default"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                  {state === 'correct' && '✓ '}{state === 'wrong' && isSelected && '✗ '}
                  {answer.answer_text}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {answerState !== 'idle' && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-slide-up">
              <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
              {q.tip && <p className="text-[#D4A843] text-xs mt-2">💡 {q.tip}</p>}
            </div>
          )}
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen
          score={score} correct={correct} total={questions.length}
          xpEarned={result.xp} coinsEarned={result.coins}
          levelUp={result.levelUp} newLevel={result.newLevel}
          branchColor={branchColor}
          onReplay={() => { setPhase('config'); setQuestions([]) }}
          gameLabel="Quiz Éclair"
        />
      )}
    </GameShell>
    </>
  )
}
