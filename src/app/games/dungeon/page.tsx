'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import ProgressBar from '@/components/ui/ProgressBar'
import { Heart, Sword, Shield } from 'lucide-react'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Answer { id: string; answer_text: string; is_correct: boolean }
interface Question { id: string; question_text: string; context_text: string | null; explanation: string; answers: Answer[] }
type Phase = 'map' | 'combat' | 'boss' | 'dead' | 'victory' | 'result'
type RoomType = 'empty' | 'combat' | 'treasure' | 'boss' | 'completed'

interface Room { id: number; type: RoomType; x: number; y: number; connected: number[] }

function generateDungeon(): Room[] {
  const rooms: Room[] = [
    { id: 0, type: 'combat', x: 50, y: 80, connected: [1, 2] },
    { id: 1, type: 'combat', x: 20, y: 60, connected: [0, 3] },
    { id: 2, type: 'treasure', x: 80, y: 60, connected: [0, 4] },
    { id: 3, type: 'combat', x: 20, y: 40, connected: [1, 5] },
    { id: 4, type: 'combat', x: 70, y: 35, connected: [2, 5] },
    { id: 5, type: 'boss', x: 45, y: 15, connected: [3, 4] },
  ]
  return rooms
}

export default function DungeonPage() {
  const [phase, setPhase] = useState<Phase>('map')
  const [rooms, setRooms] = useState<Room[]>(generateDungeon())
  const [currentRoom, setCurrentRoom] = useState(0)
  const [hp, setHp] = useState(100)
  const [maxHp] = useState(100)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean; breakdown?: import('@/lib/xp-calculator').BonusBreakdown; rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [treasureMsg, setTreasureMsg] = useState('')
  const [bossHp, setBossHp] = useState(3)
  const [startTime] = useState(() => Date.now())

  useEffect(() => {
    Promise.all([
      fetch('/api/user/character').then(r => r.json()),
      fetch('/api/game/questions?game=quiz&count=25&difficulty=2').then(r => r.json()),
    ]).then(([charData, qData]) => {
      if (charData.branch?.color) setBranchColor(charData.branch.color)
      if (qData.questions) setAllQuestions(qData.questions)
    })
  }, [])

  function getNextQuestion(difficulty: 1 | 2 | 3 = 2): Question | null {
    const available = allQuestions.filter(q => !usedIds.has(q.id))
    if (available.length === 0) return null
    const q = available[Math.floor(Math.random() * available.length)]
    setUsedIds(prev => new Set([...prev, q.id]))
    return q
  }

  function enterRoom(roomId: number) {
    const room = rooms.find(r => r.id === roomId)
    if (!room || room.type === 'completed') return

    setCurrentRoom(roomId)

    if (room.type === 'combat' || room.type === 'boss') {
      const q = getNextQuestion(room.type === 'boss' ? 3 : 2)
      if (q) {
        setQuestion(q)
        setSelectedId(null)
        setPhase(room.type)
      }
    } else if (room.type === 'treasure') {
      const healAmt = 30
      setHp(h => Math.min(maxHp, h + healAmt))
      setTreasureMsg(`+${healAmt} HP récupérés!`)
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, type: 'completed' } : r))
      setPhase('map')
      setTimeout(() => setTreasureMsg(''), 2000)
    }
  }

  function handleAnswer(answer: Answer) {
    if (selectedId) return
    setSelectedId(answer.id)
    setTotal(t => t + 1)
    const room = rooms.find(r => r.id === currentRoom)!
    const isBoss = room.type === 'boss'

    if (answer.is_correct) {
      setCorrect(c => c + 1)
      setScore(s => s + (isBoss ? 300 : 100))
      if (isBoss) {
        const newBossHp = bossHp - 1
        setBossHp(newBossHp)
        if (newBossHp <= 0) {
          setTimeout(() => setPhase('victory'), 1500)
          return
        }
      }
    } else {
      const dmg = isBoss ? 35 : 20
      const newHp = hp - dmg
      setHp(Math.max(0, newHp))
      if (newHp <= 0) {
        setTimeout(() => setPhase('dead'), 1500)
        return
      }
    }
  }

  async function leaveRoom() {
    setRooms(prev => prev.map(r => r.id === currentRoom ? { ...r, type: 'completed' } : r))
    setPhase('map')
    setQuestion(null)
    setSelectedId(null)
  }

  async function finishGame(victory: boolean) {
    const finalScore = victory ? score + 500 : Math.round(score * 0.5)
    const elapsed = (Date.now() - startTime) / 1000
    const targetTime = 5 * 60 // 5 min par run = temps rapide
    const timeBonusPct = victory ? Math.max(0, Math.min(1, 1 - elapsed / targetTime)) : 0
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'dungeon', score: finalScore, questions_total: total, questions_correct: correct, best_streak: 0, avg_time_seconds: Math.round(elapsed / Math.max(total, 1)), difficulty: 2, time_bonus_pct: timeBonusPct }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  const room = rooms.find(r => r.id === currentRoom)

  return (
    <GameShell title="Donjon Roguelike" icon="🏰" branchColor={branchColor}>
      {/* HP bar always visible */}
      {(phase === 'map' || phase === 'combat' || phase === 'boss') && (
        <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3">
          <Heart size={16} className="text-red-400 flex-shrink-0" />
          <ProgressBar value={hp} max={maxHp} color={hp > 50 ? '#25C292' : hp > 25 ? '#F59E0B' : '#FF4D6A'} height={10} />
          <span className="text-sm text-gray-400 flex-shrink-0">{hp}/{maxHp}</span>
          <span className="text-sm text-gray-500 ml-2">Score: <span style={{ color: branchColor }}>{score}</span></span>
        </div>
      )}

      {phase === 'map' && (
        <div className="max-w-2xl mx-auto">
          {treasureMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] text-center font-cinzel font-bold animate-slide-up">
              🎁 {treasureMsg}
            </div>
          )}
          <div className="rpg-card p-4 relative" style={{ height: '380px' }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {rooms.map(room =>
                room.connected.map(connId => {
                  const conn = rooms.find(r => r.id === connId)
                  if (!conn) return null
                  return (
                    <line key={`${room.id}-${connId}`}
                      x1={`${room.x}%`} y1={`${room.y}%`} x2={`${conn.x}%`} y2={`${conn.y}%`}
                      stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="6,4" />
                  )
                })
              )}
            </svg>
            {rooms.map(roomItem => {
              const isAccessible = currentRoom === -1 || rooms.find(r => r.id === currentRoom)?.connected.includes(roomItem.id) || roomItem.id === 0
              const isCurrent = roomItem.id === currentRoom
              const icons = { combat: '⚔️', boss: '💀', treasure: '🎁', empty: '?', completed: '✓' }
              const colors = { combat: '#4D8BFF', boss: '#FF4D6A', treasure: '#D4A843', empty: '#666', completed: '#25C292' }
              return (
                <button key={roomItem.id}
                  onClick={() => isAccessible && roomItem.type !== 'completed' && enterRoom(roomItem.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all duration-200 z-10"
                  style={{
                    left: `${roomItem.x}%`, top: `${roomItem.y}%`,
                    background: isCurrent ? `${colors[roomItem.type]}30` : roomItem.type === 'completed' ? 'rgba(37,194,146,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isCurrent ? colors[roomItem.type] : roomItem.type === 'completed' ? '#25C29240' : isAccessible ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: isAccessible ? 1 : 0.4,
                    cursor: isAccessible && roomItem.type !== 'completed' ? 'pointer' : 'default',
                    boxShadow: isCurrent ? `0 0 15px ${colors[roomItem.type]}60` : 'none',
                  }}>
                  {icons[roomItem.type]}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3 text-xs text-gray-500 justify-center">
            <span>⚔️ Combat</span><span>💀 Boss</span><span>🎁 Trésor</span><span>✓ Visité</span>
          </div>
        </div>
      )}

      {(phase === 'combat' || phase === 'boss') && question && (
        <div className="max-w-2xl mx-auto animate-slide-up">
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
            style={{ background: phase === 'boss' ? 'rgba(255,77,106,0.1)' : 'rgba(77,139,255,0.1)', border: `1px solid ${phase === 'boss' ? '#FF4D6A40' : '#4D8BFF40'}` }}>
            {phase === 'boss' ? <><span className="text-xl">💀</span><div><p className="font-cinzel font-bold text-red-400">BOSS!</p><p className="text-xs text-gray-400">Vie du boss: {'❤️'.repeat(bossHp)}</p></div></> : <><Sword size={18} className="text-[#4D8BFF]" /><p className="font-cinzel font-bold text-[#4D8BFF]">Combat — réponds correctement!</p></>}
          </div>

          <div className="rpg-card p-5 mb-4">
            {question.context_text && <p className="text-gray-400 text-sm italic mb-3 p-3 bg-white/5 rounded-lg">{question.context_text}</p>}
            <p className="text-white font-medium">{question.question_text}</p>
          </div>

          <div className="space-y-3 mb-4">
            {question.answers.map(a => {
              const revealed = !!selectedId
              const state = revealed ? a.is_correct ? 'correct' : selectedId === a.id ? 'wrong' : 'dim' : 'idle'
              const colors = { idle: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)', '#fff'], correct: ['rgba(37,194,146,0.12)', '#25C292', '#25C292'], wrong: ['rgba(255,77,106,0.12)', '#FF4D6A', '#FF4D6A'], dim: ['rgba(255,255,255,0.01)', 'transparent', '#374151'] }[state]
              return (
                <button key={a.id} onClick={() => handleAnswer(a)} disabled={!!selectedId}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all disabled:cursor-default"
                  style={{ background: colors[0], border: `1px solid ${colors[1]}`, color: colors[2] }}>
                  {a.answer_text}
                </button>
              )
            })}
          </div>

          {selectedId && (
            <div className="rpg-card p-4 mb-4 animate-slide-up">
              <p className="text-gray-300 text-sm">{question.explanation}</p>
              <button onClick={leaveRoom} className="mt-3 w-full py-2 rounded-lg font-semibold text-sm transition-all"
                style={{ background: `${branchColor}20`, border: `1px solid ${branchColor}40`, color: branchColor }}>
                Continuer l'exploration →
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'dead' && (
        <div className="max-w-md mx-auto text-center animate-slide-up rpg-card p-8">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="font-cinzel text-2xl font-bold text-red-400 mb-2">Défaite</h2>
          <p className="text-gray-400 text-sm mb-6">Tu es tombé au combat. Mais tu as quand même gagné de l'expérience!</p>
          <div className="flex gap-3">
            <button onClick={() => finishGame(false)} className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm border border-white/10 text-gray-300">Voir les résultats</button>
            <button onClick={() => { setRooms(generateDungeon()); setHp(100); setScore(0); setCorrect(0); setTotal(0); setCurrentRoom(0); setBossHp(3); setUsedIds(new Set()); setPhase('map') }}
              className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm" style={{ background: `${branchColor}20`, border: `1px solid ${branchColor}40`, color: branchColor }}>
              Recommencer
            </button>
          </div>
        </div>
      )}

      {phase === 'victory' && (
        <div className="max-w-md mx-auto text-center animate-slide-up rpg-card p-8">
          <div className="text-6xl mb-4 animate-float">🏆</div>
          <h2 className="font-cinzel text-2xl font-bold text-[#D4A843] mb-2">VICTOIRE!</h2>
          <p className="text-gray-400 text-sm mb-6">Tu as vaincu le Boss! Le donjon est conquis.</p>
          <button onClick={() => finishGame(true)} className="w-full py-3 rounded-lg font-cinzel font-semibold text-sm tracking-widest uppercase"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
            Réclamer tes récompenses
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen score={score} correct={correct} total={total}
          xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
          branchColor={branchColor}
          onReplay={() => { setRooms(generateDungeon()); setHp(100); setScore(0); setCorrect(0); setTotal(0); setCurrentRoom(0); setBossHp(3); setUsedIds(new Set()); setPhase('map') }}
          gameLabel="Donjon"
          bonusBreakdown={result.breakdown}
          rankUpReward={result.rankUp} />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
