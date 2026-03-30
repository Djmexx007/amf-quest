'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Answer { answer_text: string; is_correct: boolean }
interface Question { id: string; question_text: string; answers: Answer[] }

interface FallingItem {
  id: string
  label: string
  correctCategory: string
  x: number    // 0-100%
  y: number    // 0-100vh
  speed: number
  answered: boolean
}

type Phase = 'config' | 'playing' | 'result'

export default function SpeedSortPage() {
  const [phase, setPhase] = useState<Phase>('config')
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [questions, setQuestions] = useState<Question[]>([])
  const [items, setItems] = useState<FallingItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [combo, setCombo] = useState(0)
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameStarted, setGameStarted] = useState(false)
  const itemQueue = useRef<Question[]>([])
  const frameRef = useRef<number>(0)
  const lastSpawn = useRef<number>(0)

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
  }, [])

  async function startGame() {
    const res = await fetch('/api/game/questions?game=quiz&count=30')
    const data = await res.json()
    if (!data.questions?.length) { alert('Pas de questions disponibles.'); return }

    // Build categories from correct answers
    const qs: Question[] = data.questions
    const cats = [...new Set(qs.map((q: Question) => q.answers.find(a => a.is_correct)?.answer_text ?? 'Autre').slice(0, 4))] as string[]
    setCategories(cats)
    itemQueue.current = qs
    setItems([]); setScore(0); setCorrect(0); setTotal(0); setCombo(0); setTimeLeft(60)
    setQuestions(qs)
    setPhase('playing')
    setGameStarted(true)
  }

  // Timer
  useEffect(() => {
    if (!gameStarted || phase !== 'playing') return
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { finishGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [gameStarted, phase])

  // Spawn + gravity loop
  useEffect(() => {
    if (phase !== 'playing') return
    let frame: number
    const loop = (ts: number) => {
      // Spawn item every 2.5s
      if (ts - lastSpawn.current > 2500 && itemQueue.current.length > 0) {
        const q = itemQueue.current.shift()!
        const newItem: FallingItem = {
          id: `${q.id}-${ts}`,
          label: q.question_text.slice(0, 40),
          correctCategory: q.answers.find(a => a.is_correct)?.answer_text ?? categories[0] ?? '',
          x: 10 + Math.random() * 80,
          y: 0,
          speed: 0.08 + Math.random() * 0.06,
          answered: false,
        }
        setItems(prev => [...prev.filter(i => !i.answered), newItem])
        lastSpawn.current = ts
      }
      // Move items down
      setItems(prev => prev.map(item => {
        if (item.answered) return item
        const newY = item.y + item.speed
        if (newY > 100) {
          // missed — count as wrong
          setTotal(t => t + 1)
          setCombo(0)
          return { ...item, answered: true }
        }
        return { ...item, y: newY }
      }).filter(i => !i.answered || i.y < 110))
      frame = requestAnimationFrame(loop)
      frameRef.current = frame
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [phase, categories])

  const handleSort = useCallback((itemId: string, category: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId)
      if (!item || item.answered) return prev
      const isCorrect = item.correctCategory === category || category === item.correctCategory
      setTotal(t => t + 1)
      if (isCorrect) {
        setCorrect(c => c + 1)
        setCombo(c => {
          const nc = c + 1
          setScore(s => s + 100 + nc * 10)
          return nc
        })
      } else {
        setCombo(0)
      }
      return prev.map(i => i.id === itemId ? { ...i, answered: true } : i)
    })
  }, [])

  async function finishGame() {
    cancelAnimationFrame(frameRef.current)
    setGameStarted(false)
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'speed-sort', score, questions_total: total, questions_correct: correct, best_streak: combo, avg_time_seconds: 1, difficulty: 2 }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  return (
    <GameShell title="Speed Sort" icon="🌪️" branchColor={branchColor}>
      {phase === 'config' && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-8 text-center">
            <div className="text-5xl mb-4">🌪️</div>
            <h2 className="font-cinzel text-xl font-bold text-white mb-2">Speed Sort</h2>
            <p className="text-gray-400 text-sm mb-8">Des termes tombent du ciel. Clique sur la bonne catégorie avant qu'ils touchent le sol. 60 secondes.</p>
            <button onClick={startGame} className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase"
              style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12' }}>
              Commencer
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-2"
            style={{ background: 'rgba(8,10,18,0.8)', backdropFilter: 'blur(8px)' }}>
            <span className="font-cinzel font-bold text-white">Score: <span style={{ color: branchColor }}>{score}</span></span>
            {combo > 1 && <span className="font-cinzel font-bold text-[#D4A843]">COMBO x{combo}!</span>}
            <span className="font-cinzel font-bold" style={{ color: timeLeft < 15 ? '#FF4D6A' : '#25C292' }}>{timeLeft}s</span>
          </div>

          {/* Falling items */}
          {items.map(item => (
            <div key={item.id}
              className="absolute z-10 px-3 py-2 rounded-lg text-xs font-medium max-w-[140px] text-center pointer-events-none"
              style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)', background: '#161D35', border: `1px solid ${branchColor}40`, color: '#fff' }}>
              {item.label}
            </div>
          ))}

          {/* Category buckets at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-20 grid p-3 gap-2"
            style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)`, background: 'rgba(8,10,18,0.9)' }}>
            {categories.map((cat, i) => (
              <div key={cat} className="relative">
                <button
                  onClick={() => {
                    // Sort the lowest item into this category
                    const lowest = items.filter(i => !i.answered).sort((a, b) => b.y - a.y)[0]
                    if (lowest) handleSort(lowest.id, cat)
                  }}
                  className="w-full py-3 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: `${branchColor}15`, border: `2px solid ${branchColor}40`, color: branchColor }}>
                  {cat.length > 20 ? cat.slice(0, 20) + '…' : cat}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen score={score} correct={correct} total={total}
          xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
          bonusBreakdown={result.breakdown} rankUpReward={result.rankUp}
          branchColor={branchColor} onReplay={() => setPhase('config')} gameLabel="Speed Sort" />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
