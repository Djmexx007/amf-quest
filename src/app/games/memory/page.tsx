'use client'

import { useState, useEffect, useCallback } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import { useAuth } from '@/hooks/useAuth'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Card { id: string; content: string; pairId: string; type: 'term' | 'def'; flipped: boolean; matched: boolean }
type Phase = 'config' | 'playing' | 'result'

const GRID_SIZES = { '4x4': 8, '5x5': 12, '6x6': 18 } // pairs

export default function MemoryPage() {
  const [phase, setPhase] = useState<Phase>('config')
  const [gridSize, setGridSize] = useState<'4x4' | '5x5' | '6x6'>('4x4')
  const [cards, setCards] = useState<Card[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [matched, setMatched] = useState(0)
  const [timer, setTimer] = useState(0)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    const iv = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [phase])

  async function startGame() {
    const pairsCount = GRID_SIZES[gridSize]
    const res = await fetch(`/api/game/questions?game=quiz&count=${pairsCount}`)
    const data = await res.json()
    if (!data.questions?.length) { alert('Pas assez de questions disponibles.'); return }

    const qs = data.questions.slice(0, pairsCount)
    const deck: Card[] = []
    qs.forEach((q: { id: string; question_text: string; answers: { is_correct: boolean; answer_text: string }[] }) => {
      const correctAnswer = q.answers.find((a) => a.is_correct)?.answer_text ?? '—'
      deck.push({ id: `t-${q.id}`, content: q.question_text, pairId: q.id, type: 'term', flipped: false, matched: false })
      deck.push({ id: `d-${q.id}`, content: correctAnswer, pairId: q.id, type: 'def', flipped: false, matched: false })
    })
    // Shuffle
    deck.sort(() => Math.random() - 0.5)
    setCards(deck)
    setSelected([]); setAttempts(0); setMatched(0); setTimer(0); setLocked(false)
    setPhase('playing')
  }

  const handleCardClick = useCallback((cardId: string) => {
    if (locked) return
    setCards(prev => {
      const card = prev.find(c => c.id === cardId)
      if (!card || card.flipped || card.matched) return prev
      return prev.map(c => c.id === cardId ? { ...c, flipped: true } : c)
    })
    setSelected(prev => {
      if (prev.includes(cardId) || prev.length >= 2) return prev
      const newSel = [...prev, cardId]
      if (newSel.length === 2) {
        setAttempts(a => a + 1)
        setLocked(true)
        setTimeout(() => {
          setCards(cards => {
            const [a, b] = newSel.map(id => cards.find(c => c.id === id)!)
            if (a && b && a.pairId === b.pairId && a.type !== b.type) {
              setMatched(m => {
                const nm = m + 1
                if (nm === GRID_SIZES[gridSize]) finishGame(nm)
                return nm
              })
              return cards.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c)
            } else {
              return cards.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c)
            }
          })
          setSelected([])
          setLocked(false)
        }, 900)
      }
      return newSel
    })
  }, [locked, gridSize])

  async function finishGame(matchedPairs: number) {
    const total = GRID_SIZES[gridSize]
    const score = Math.max(0, Math.round((matchedPairs / total) * 100 - attempts * 2 + 50))
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'memory', score, questions_total: total, questions_correct: matchedPairs, best_streak: 0, avg_time_seconds: timer / total, difficulty: gridSize === '6x6' ? 3 : gridSize === '5x5' ? 2 : 1 }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  const cols = gridSize === '4x4' ? 4 : gridSize === '5x5' ? 6 : 6

  return (
    <GameShell title="Memory Match" icon="🃏" branchColor={branchColor}>
      {phase === 'config' && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-8 text-center">
            <div className="text-5xl mb-4">🃏</div>
            <h2 className="font-cinzel text-xl font-bold text-white mb-2">Memory Match</h2>
            <p className="text-gray-400 text-sm mb-8">Associe les termes à leurs définitions.</p>
            <div className="mb-8">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Grille</p>
              <div className="flex gap-3">
                {(['4x4', '5x5', '6x6'] as const).map(g => (
                  <button key={g} onClick={() => setGridSize(g)}
                    className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{ background: gridSize === g ? `${branchColor}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${gridSize === g ? branchColor : 'rgba(255,255,255,0.08)'}`, color: gridSize === g ? branchColor : '#9CA3AF' }}>
                    {g}
                    <div className="text-xs mt-0.5 opacity-70">{GRID_SIZES[g]} paires</div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startGame} className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase transition-all"
              style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12' }}>
              Commencer
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between text-sm text-gray-400 mb-4">
            <span>Paires: <strong className="text-white">{matched}/{GRID_SIZES[gridSize]}</strong></span>
            <span>Tentatives: <strong className="text-white">{attempts}</strong></span>
            <span>Temps: <strong style={{ color: branchColor }}>{Math.floor(timer/60)}:{String(timer%60).padStart(2,'0')}</strong></span>
          </div>
          <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {cards.map(card => (
              <button key={card.id} onClick={() => handleCardClick(card.id)}
                className="rounded-xl font-medium transition-all duration-300 p-2 sm:p-3 flex items-center justify-center text-center leading-snug"
                style={{
                  minHeight: cols === 4 ? '7rem' : '6rem',
                  background: card.matched ? `${branchColor}20` : card.flipped ? '#161D35' : '#111628',
                  border: `1px solid ${card.matched ? `${branchColor}50` : card.flipped ? `${branchColor}30` : 'rgba(255,255,255,0.06)'}`,
                  color: card.matched ? branchColor : card.flipped ? '#fff' : 'transparent',
                  transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(180deg)',
                  cursor: card.matched ? 'default' : 'pointer',
                  fontSize: card.content.length > 60 ? '12px' : card.content.length > 30 ? '13px' : '14px',
                }}>
                {(card.flipped || card.matched) ? card.content : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen score={Math.max(0, 100 - attempts * 2)} correct={matched} total={GRID_SIZES[gridSize]}
          xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
          bonusBreakdown={result.breakdown} rankUpReward={result.rankUp}
          branchColor={branchColor} onReplay={() => { setPhase('config'); setCards([]) }} gameLabel="Memory Match" />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
