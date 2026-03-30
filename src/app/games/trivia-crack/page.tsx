'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Answer { id: string; answer_text: string; is_correct: boolean }
interface Question { id: string; question_text: string; answers: Answer[]; tags: string[] | null }
type Phase = 'wheel' | 'question' | 'result'

const CATEGORIES = [
  { key: 'produits',   label: 'Produits',   icon: '📦', color: '#25C292' },
  { key: 'conformite', label: 'Conformité', icon: '⚖️', color: '#4D8BFF' },
  { key: 'client',     label: 'Client',     icon: '👤', color: '#D4A843' },
  { key: 'calculs',    label: 'Calculs',    icon: '🧮', color: '#F59E0B' },
  { key: 'contrats',   label: 'Contrats',   icon: '📋', color: '#FF4D6A' },
  { key: 'lois',       label: 'Lois',       icon: '📜', color: '#A78BFA' },
]

export default function TriviaCrackPage() {
  const [phase, setPhase] = useState<Phase>('wheel')
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedCat, setSelectedCat] = useState<typeof CATEGORIES[0] | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [mastered, setMastered] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
    fetch('/api/game/questions?game=quiz&count=30').then(r => r.json()).then(d => {
      setAllQuestions(d.questions ?? [])
    })
  }, [])

  function spinWheel() {
    if (spinning) return
    setSpinning(true)
    const extra = 360 * (3 + Math.floor(Math.random() * 3))
    const catAngle = Math.floor(Math.random() * 6) * 60
    const newRot = rotation + extra + catAngle
    setRotation(newRot)
    setTimeout(() => {
      const catIdx = Math.floor(((newRot % 360) / 360) * 6)
      setSelectedCat(CATEGORIES[catIdx % 6])
      setSpinning(false)
      fetchQuestion(CATEGORIES[catIdx % 6])
    }, 2000)
  }

  async function fetchQuestion(cat: typeof CATEGORIES[0]) {
    const available = allQuestions.filter(q =>
      !q.tags || q.tags.length === 0 || q.tags.some(t => t.includes(cat.key))
    )
    const pool = available.length > 0 ? available : allQuestions
    const q = pool[Math.floor(Math.random() * pool.length)]
    if (q) { setQuestion(q); setSelectedId(null); setPhase('question') }
  }

  function handleAnswer(answer: Answer) {
    setSelectedId(answer.id)
    setTotal(t => t + 1)
    if (answer.is_correct) {
      setCorrect(c => c + 1)
      setScore(s => s + 100)
      if (selectedCat) setMastered(m => new Set([...m, selectedCat.key]))
    }
  }

  async function nextRound() {
    if (total >= 9) {
      await finishGame()
    } else {
      setPhase('wheel')
      setQuestion(null)
      setSelectedId(null)
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
  const sliceAngle = 60

  return (
    <GameShell title="Trivia Crack" icon="🎯" branchColor={branchColor}>
      {phase === 'wheel' && (
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          <div className="flex justify-center gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${mastered.has(cat.key) ? 'ring-2' : 'opacity-30'}`}
                  style={{ background: `${cat.color}20`, borderColor: cat.color, outline: mastered.has(cat.key) ? `2px solid ${cat.color}` : 'none' }}>
                  {cat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Wheel */}
          <div className="relative inline-block mb-6">
            <svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}
              style={{ transition: spinning ? 'transform 2s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none', transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}>
              {CATEGORIES.map((cat, i) => {
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
                return (
                  <g key={cat.key}>
                    <path d={`M ${cx} ${cx} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={cat.color} opacity="0.8" stroke="#080A12" strokeWidth="2" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="18">{cat.icon}</text>
                  </g>
                )
              })}
              <circle cx={cx} cy={cx} r="20" fill="#080A12" stroke="#D4A843" strokeWidth="2" />
            </svg>
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[#D4A843] text-2xl">▼</div>
          </div>

          <div className="mb-4 text-sm text-gray-400">{total}/9 questions · <span style={{ color: branchColor }}>{correct} correctes</span></div>

          <button onClick={spinWheel} disabled={spinning}
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
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: `${selectedCat.color}15`, border: `1px solid ${selectedCat.color}30` }}>
            <span className="text-2xl">{selectedCat.icon}</span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Catégorie</p>
              <p className="font-cinzel font-bold" style={{ color: selectedCat.color }}>{selectedCat.label}</p>
            </div>
          </div>

          <div className="rpg-card p-6 mb-4">
            <p className="text-white font-medium leading-relaxed">{question.question_text}</p>
          </div>

          <div className="space-y-3 mb-4">
            {question.answers.map(a => {
              const revealed = selectedId !== null
              const isSelected = selectedId === a.id
              const state = revealed ? a.is_correct ? 'correct' : isSelected ? 'wrong' : 'dim' : 'idle'
              const colors = { idle: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)', '#fff'], correct: ['rgba(37,194,146,0.12)', '#25C292', '#25C292'], wrong: ['rgba(255,77,106,0.12)', '#FF4D6A', '#FF4D6A'], dim: ['rgba(255,255,255,0.01)', 'transparent', '#374151'] }[state]
              return (
                <button key={a.id} onClick={() => !selectedId && handleAnswer(a)} disabled={!!selectedId}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all disabled:cursor-default"
                  style={{ background: colors[0], border: `1px solid ${colors[1]}`, color: colors[2] }}>
                  {a.answer_text}
                </button>
              )
            })}
          </div>

          {selectedId && (
            <button onClick={nextRound} className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase transition-all"
              style={{ background: `${selectedCat.color}20`, border: `1px solid ${selectedCat.color}40`, color: selectedCat.color }}>
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
          gameLabel="Trivia Crack" />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
