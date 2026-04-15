'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Category { id: string; name: string; icon: string | null; color: string | null }
interface Question { id: string; question: string; answers: string[]; correct_answer: string }
type Phase = 'wheel' | 'question' | 'result'

export default function TriviaCrackPage() {
  const [phase, setPhase] = useState<Phase>('wheel')
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [categories, setCategories] = useState<Category[]>([])
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [mastered, setMastered] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
    fetch('/api/game/categories').then(r => r.json()).then(d => {
      setCategories(d.categories ?? [])
    })
  }, [])

  const catCount = categories.length || 1
  const sliceAngle = 360 / catCount

  function spinWheel() {
    if (spinning || categories.length === 0) return
    setSpinning(true)
    const extra = 360 * (3 + Math.floor(Math.random() * 3))
    const catAngle = Math.floor(Math.random() * catCount) * sliceAngle
    const newRot = rotation + extra + catAngle
    setRotation(newRot)
    setTimeout(() => {
      const catIdx = Math.floor(((newRot % 360) / 360) * catCount) % catCount
      const cat = categories[catIdx]
      setSelectedCat(cat)
      setSpinning(false)
      fetchQuestion(cat)
    }, 2000)
  }

  async function fetchQuestion(cat: Category) {
    const res = await fetch(`/api/game/questions?category=${encodeURIComponent(cat.name)}&count=5`)
    const data = await res.json()
    const pool: Question[] = data.questions ?? []
    if (!pool.length) return
    const q = pool[Math.floor(Math.random() * pool.length)]
    setQuestion(q); setSelectedAnswer(null); setPhase('question')
  }

  function handleAnswer(answer: string) {
    setSelectedAnswer(answer)
    setTotal(t => t + 1)
    if (answer === question?.correct_answer) {
      setCorrect(c => c + 1)
      setScore(s => s + 100)
      if (selectedCat) setMastered(m => new Set([...m, selectedCat.id]))
    }
  }

  async function nextRound() {
    if (total >= 9) {
      await finishGame()
    } else {
      setPhase('wheel')
      setQuestion(null)
      setSelectedAnswer(null)
      setSelectedCat(null)
    }
  }

  async function finishGame() {
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'trivia-crack', score, questions_total: total || 1, questions_correct: correct, best_streak: 0, avg_time_seconds: 15, difficulty: 1 }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  // Wheel SVG
  const wheelSize = 260
  const cx = wheelSize / 2

  return (
    <GameShell title="Arène du Savoir" icon="🏟️" branchColor={branchColor}>
      {phase === 'wheel' && (
        <div className="max-w-lg xl:max-w-2xl mx-auto text-center animate-fade-in">
          <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
            {categories.map(cat => (
              <div key={cat.id} className="text-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base transition-all ${mastered.has(cat.id) ? 'ring-2' : 'opacity-30'}`}
                  style={{ background: `${cat.color ?? branchColor}20`, borderColor: cat.color ?? branchColor, outline: mastered.has(cat.id) ? `2px solid ${cat.color ?? branchColor}` : 'none' }}>
                  {cat.icon ?? '📚'}
                </div>
              </div>
            ))}
          </div>

          {/* Wheel */}
          <div className="relative w-56 sm:w-64 lg:w-72 xl:w-80 2xl:w-96 mx-auto mb-6">
            {categories.length === 0 ? (
              <div className="w-full aspect-square rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-gray-500 text-sm">Chargement...</p>
              </div>
            ) : (
              <svg width="100%" height="100%" viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                style={{ transition: spinning ? 'transform 2s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none', transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
                {categories.map((cat, i) => {
                  const startAngle = (i * sliceAngle - 90) * (Math.PI / 180)
                  const endAngle = ((i + 1) * sliceAngle - 90) * (Math.PI / 180)
                  const r = wheelSize / 2 - 5
                  const x1 = cx + r * Math.cos(startAngle)
                  const y1 = cx + r * Math.sin(startAngle)
                  const x2 = cx + r * Math.cos(endAngle)
                  const y2 = cx + r * Math.sin(endAngle)
                  const midAngle = ((i + 0.5) * sliceAngle - 90) * (Math.PI / 180)
                  const tx = cx + (r * 0.65) * Math.cos(midAngle)
                  const ty = cx + (r * 0.65) * Math.sin(midAngle)
                  const largeArc = sliceAngle > 180 ? 1 : 0
                  return (
                    <g key={cat.id}>
                      <path d={`M ${cx} ${cx} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={cat.color ?? branchColor} opacity="0.8" stroke="#080A12" strokeWidth="2" />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="18">{cat.icon ?? '📚'}</text>
                    </g>
                  )
                })}
                <circle cx={cx} cy={cx} r="20" fill="#080A12" stroke="#D4A843" strokeWidth="2" />
              </svg>
            )}
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[#D4A843] text-2xl">▼</div>
          </div>

          <div className="mb-4 text-sm text-gray-400">{total}/9 questions · <span style={{ color: branchColor }}>{correct} correctes</span></div>

          <button onClick={spinWheel} disabled={spinning || categories.length === 0}
            className="px-10 py-3 rounded-lg font-cinzel font-bold text-sm tracking-widest uppercase disabled:opacity-50 transition-all"
            style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12', boxShadow: `0 0 20px ${branchColor}30` }}>
            {spinning ? 'Rotation...' : 'Tourner la roue!'}
          </button>

          {total > 0 && !spinning && (
            <button onClick={finishGame} className="mt-3 block w-full text-gray-500 text-sm hover:text-gray-300">Terminer la partie</button>
          )}
        </div>
      )}

      {phase === 'question' && question && selectedCat && (
        <div className="max-w-xl mx-auto animate-slide-up">
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: `${selectedCat.color ?? branchColor}15`, border: `1px solid ${selectedCat.color ?? branchColor}30` }}>
            <span className="text-2xl">{selectedCat.icon ?? '📚'}</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Catégorie</p>
              <p className="font-cinzel font-bold" style={{ color: selectedCat.color ?? branchColor }}>{selectedCat.name}</p>
            </div>
          </div>

          <div className="rpg-card p-6 mb-4">
            <p className="text-white font-medium leading-relaxed">{question.question}</p>
          </div>

          <div className="space-y-3 mb-4">
            {question.answers.map((a, i) => {
              const revealed = selectedAnswer !== null
              const isSelected = selectedAnswer === a
              const isCorrect = a === question.correct_answer
              const state = revealed ? isCorrect ? 'correct' : isSelected ? 'wrong' : 'dim' : 'idle'
              const colors = {
                idle: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)', '#fff'],
                correct: ['rgba(37,194,146,0.12)', '#25C292', '#25C292'],
                wrong: ['rgba(255,77,106,0.12)', '#FF4D6A', '#FF4D6A'],
                dim: ['rgba(255,255,255,0.01)', 'transparent', '#374151'],
              }[state]
              return (
                <button key={i} onClick={() => !selectedAnswer && handleAnswer(a)} disabled={!!selectedAnswer}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all disabled:cursor-default"
                  style={{ background: colors[0], border: `1px solid ${colors[1]}`, color: colors[2] }}>
                  {a}
                </button>
              )
            })}
          </div>

          {selectedAnswer && selectedAnswer !== question.correct_answer && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#9CA3AF' }}>
              Bonne réponse : <span className="text-green-400 font-medium">{question.correct_answer}</span>
            </div>
          )}

          {selectedAnswer && (
            <button onClick={nextRound} className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase transition-all"
              style={{ background: `${selectedCat.color ?? branchColor}20`, border: `1px solid ${selectedCat.color ?? branchColor}40`, color: selectedCat.color ?? branchColor }}>
              {total >= 9 ? 'Voir les résultats →' : 'Tour suivant →'}
            </button>
          )}
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen score={score} correct={correct} total={total || 1}
          xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
          bonusBreakdown={result.breakdown} rankUpReward={result.rankUp}
          branchColor={branchColor}
          onReplay={() => { setPhase('wheel'); setCorrect(0); setTotal(0); setScore(0); setMastered(new Set()) }}
          gameLabel="Arène du Savoir" />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
