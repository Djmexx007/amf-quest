'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import ProgressBar from '@/components/ui/ProgressBar'
import { Heart } from 'lucide-react'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Question {
  id: string
  question: string
  context: string | null
  answers: string[]
  correct_answer: string
}

type NodeType = 'start' | 'combat' | 'elite' | 'rest' | 'event' | 'shop' | 'boss'
type Phase = 'map' | 'combat' | 'elite' | 'rest' | 'event' | 'shop' | 'boss_fight' | 'dead' | 'victory' | 'result'

interface MapNode {
  id: number
  floor: number
  col: number
  totalCols: number
  type: NodeType
  connections: number[]
  visited: boolean
}

interface EventOption { label: string; hpDelta?: number; scoreDelta?: number; risky?: boolean }
interface EventData { title: string; options: EventOption[] }

// ─── Constants ───────────────────────────────────────────────────────────────

const FLOOR_SIZES = [1, 2, 3, 2, 1]
const ROOM_POOL: NodeType[] = ['combat', 'combat', 'combat', 'elite', 'rest', 'event', 'shop']
const BOSS_MAX_HP = 3

const NODE_ICONS: Record<NodeType, string> = {
  start: '🚪', combat: '⚔️', elite: '💀', rest: '❤️', event: '❓', shop: '🛒', boss: '👑',
}
const NODE_COLORS: Record<NodeType, string> = {
  start: '#6B7280', combat: '#4D8BFF', elite: '#FF4D6A',
  rest: '#25C292', event: '#F59E0B', shop: '#D4A843', boss: '#FF4D6A',
}
const NODE_LABELS: Record<NodeType, string> = {
  start: 'Départ', combat: 'Combat', elite: 'Élite',
  rest: 'Repos', event: 'Événement', shop: 'Marché', boss: 'BOSS',
}

const EVENTS: EventData[] = [
  {
    title: '📜 Vieille bibliothèque',
    options: [
      { label: '+15 HP · Étudier les grimoires', hpDelta: 15 },
      { label: '+150 score · Trouver un parchemin', scoreDelta: 150 },
    ],
  },
  {
    title: '⚗️ Alchimiste mystérieux',
    options: [
      { label: '+25 HP · Boire la potion bleue', hpDelta: 25 },
      { label: '+200 score · Boire la potion rouge (risqué)', scoreDelta: 200, risky: true },
    ],
  },
  {
    title: '🗺️ Salle au trésor secrète',
    options: [
      { label: '+250 score · Ouvrir le coffre', scoreDelta: 250 },
      { label: 'Ignorer et passer', scoreDelta: 0 },
    ],
  },
  {
    title: '👻 Fantôme oublié',
    options: [
      { label: 'Écouter son histoire · +100 score', scoreDelta: 100 },
      { label: 'Fuir (rien ne se passe)' },
    ],
  },
  {
    title: '🏺 Sanctuaire ancien',
    options: [
      { label: 'Se reposer · +20 HP', hpDelta: 20 },
      { label: 'Prier pour la victoire · +180 score', scoreDelta: 180 },
    ],
  },
]

// ─── Map generation ──────────────────────────────────────────────────────────

function generateMap(): MapNode[] {
  const nodes: MapNode[] = []
  const byFloor: number[][] = []
  let id = 0

  for (let f = 0; f < FLOOR_SIZES.length; f++) {
    const cols = FLOOR_SIZES[f]
    byFloor[f] = []
    for (let c = 0; c < cols; c++) {
      const type: NodeType =
        f === 0 ? 'start' :
        f === FLOOR_SIZES.length - 1 ? 'boss' :
        ROOM_POOL[Math.floor(Math.random() * ROOM_POOL.length)]
      nodes.push({ id, floor: f, col: c, totalCols: cols, type, connections: [], visited: f === 0 })
      byFloor[f].push(id)
      id++
    }
  }

  for (let f = 0; f < FLOOR_SIZES.length - 1; f++) {
    const curr = byFloor[f]
    const next = byFloor[f + 1]
    const reached = new Set<number>()

    for (let ci = 0; ci < curr.length; ci++) {
      const ni = Math.round((ci / Math.max(curr.length - 1, 1)) * (next.length - 1))
      nodes[curr[ci]].connections.push(next[ni])
      reached.add(next[ni])
      if (Math.random() < 0.45 && nodes[curr[ci]].connections.length < 2) {
        const alts = next.filter(n => !nodes[curr[ci]].connections.includes(n))
        if (alts.length > 0) {
          const extra = alts[Math.floor(Math.random() * alts.length)]
          nodes[curr[ci]].connections.push(extra)
          reached.add(extra)
        }
      }
    }

    for (const nid of next) {
      if (!reached.has(nid)) {
        const tPos = nodes[nid].col / Math.max(nodes[nid].totalCols - 1, 1)
        const src = curr.reduce((best, cid) => {
          const bPos = nodes[best].col / Math.max(nodes[best].totalCols - 1, 1)
          const cPos = nodes[cid].col / Math.max(nodes[cid].totalCols - 1, 1)
          return Math.abs(cPos - tPos) < Math.abs(bPos - tPos) ? cid : best
        }, curr[0])
        if (!nodes[src].connections.includes(nid)) nodes[src].connections.push(nid)
      }
    }
  }

  return nodes
}

function nodePos(node: MapNode): { x: number; y: number } {
  const y = 90 - (node.floor / (FLOOR_SIZES.length - 1)) * 80
  const x = node.totalCols === 1 ? 50 : 18 + (node.col / (node.totalCols - 1)) * 64
  return { x, y }
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DungeonPage() {
  const [phase, setPhase] = useState<Phase>('map')
  const [nodes, setNodes] = useState<MapNode[]>(() => generateMap())
  const [currentNodeId, setCurrentNodeId] = useState(0)
  const [hp, setHp] = useState(100)
  const maxHp = 100
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{
    finalScore: number; xpEarned: number; coinsEarned: number; levelUp: boolean; newLevel?: number
    bonusBreakdown?: import('@/lib/xp-calculator').BonusBreakdown
    rankUpReward?: { name: string; bonusCoins: number; bonusXP: number } | null
  } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [bossHp, setBossHp] = useState(BOSS_MAX_HP)
  const [startTime] = useState(() => Date.now())
  const [hasRevive, setHasRevive] = useState(false)
  const [reviveUsed, setReviveUsed] = useState(false)
  const [reviveMsg, setReviveMsg] = useState('')
  const [notif, setNotif] = useState('')
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/character').then(r => r.json()),
      fetch('/api/game/questions?count=30').then(r => r.json()),
    ]).then(([charData, qData]) => {
      if (charData.branch?.color) setBranchColor(charData.branch.color)
      if (qData.questions) setAllQuestions(qData.questions)
      const equipped: { item_type: string; effect: Record<string, unknown> }[] = charData.equipped_items ?? []
      setHasRevive(equipped.some(i => i.item_type === 'boost' && i.effect?.dungeon_revive))
    })
  }, [])

  function flash(msg: string) {
    setNotif(msg)
    setTimeout(() => setNotif(''), 2500)
  }

  function drawQuestion(currentUsed: Set<string>): { q: Question; newUsed: Set<string> } | null {
    const avail = allQuestions.filter(q => !currentUsed.has(q.id))
    if (!avail.length) return null
    const q = avail[Math.floor(Math.random() * avail.length)]
    return { q, newUsed: new Set([...currentUsed, q.id]) }
  }

  function markVisited(nodeId: number) {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, visited: true } : n))
  }

  function enterNode(nodeId: number) {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.visited) return
    setCurrentNodeId(nodeId)

    if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
      const drawn = drawQuestion(usedIds)
      if (!drawn) { markVisited(nodeId); return }
      setUsedIds(drawn.newUsed)
      setQuestion(drawn.q)
      setSelectedAnswer(null)
      if (node.type === 'boss') { setBossHp(BOSS_MAX_HP); setPhase('boss_fight') }
      else setPhase(node.type)
    } else if (node.type === 'rest') {
      setPhase('rest')
    } else if (node.type === 'event') {
      setActiveEvent(EVENTS[Math.floor(Math.random() * EVENTS.length)])
      setPhase('event')
    } else if (node.type === 'shop') {
      setPhase('shop')
    }
  }

  function handleAnswer(answer: string, isElite: boolean, isBoss: boolean) {
    if (selectedAnswer) return
    setSelectedAnswer(answer)
    setTotal(t => t + 1)

    if (answer === question?.correct_answer) {
      setCorrect(c => c + 1)
      setScore(s => s + (isBoss ? 300 : isElite ? 200 : 100))
      if (isBoss) {
        const newBossHp = bossHp - 1
        setBossHp(newBossHp)
        if (newBossHp <= 0) { markVisited(currentNodeId); setTimeout(() => setPhase('victory'), 1500) }
      } else {
        markVisited(currentNodeId)
      }
    } else {
      const dmg = isBoss ? 35 : isElite ? 30 : 20
      const newHp = Math.max(0, hp - dmg)
      setHp(newHp)
      if (newHp <= 0) {
        if (hasRevive && !reviveUsed) {
          setReviveUsed(true)
          setHasRevive(false)
          setHp(50)
          setReviveMsg('💫 Second Souffle activé ! +50 HP')
          setTimeout(() => setReviveMsg(''), 3000)
          fetch('/api/shop/consume-boost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ effect_key: 'dungeon_revive' }),
          }).catch(() => {})
        } else {
          setTimeout(() => { markVisited(currentNodeId); setPhase('dead') }, 1500)
          return
        }
      }
      if (!isBoss) markVisited(currentNodeId)
    }
  }

  function continueBoss() {
    if (bossHp <= 0) return
    const drawn = drawQuestion(usedIds)
    if (!drawn) return
    setUsedIds(drawn.newUsed)
    setQuestion(drawn.q)
    setSelectedAnswer(null)
  }

  function backToMap() {
    setPhase('map')
    setQuestion(null)
    setSelectedAnswer(null)
  }

  function handleEventChoice(opt: EventOption) {
    if (opt.hpDelta) { setHp(h => Math.min(maxHp, h + opt.hpDelta!)); flash(`❤️ +${opt.hpDelta} HP`) }
    if (opt.scoreDelta && opt.scoreDelta > 0) {
      if (opt.risky && Math.random() < 0.4) {
        setHp(h => Math.max(1, h - 15))
        flash('😱 La potion était empoisonnée ! −15 HP')
      } else {
        setScore(s => s + opt.scoreDelta!)
        flash(`✨ +${opt.scoreDelta} score`)
      }
    }
    markVisited(currentNodeId)
    setActiveEvent(null)
    setPhase('map')
  }

  function doRest() {
    setHp(h => Math.min(maxHp, h + 30))
    markVisited(currentNodeId)
    flash('❤️ Repos : +30 HP récupérés')
    setPhase('map')
  }

  function doShop(choice: 'heal' | 'score') {
    if (choice === 'heal') { setHp(h => Math.min(maxHp, h + 40)); flash('🧪 Potion : +40 HP') }
    else { setScore(s => s + 300); flash('📚 Grimoire : +300 score') }
    markVisited(currentNodeId)
    setPhase('map')
  }

  async function finishGame(victory: boolean) {
    const finalScore = victory ? score + 500 : Math.round(score * 0.5)
    const elapsed = (Date.now() - startTime) / 1000
    const timeBonusPct = victory ? Math.max(0, Math.min(1, 1 - elapsed / (5 * 60))) : 0
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'dungeon', score: finalScore,
        questions_total: total, questions_correct: correct,
        best_streak: 0, avg_time_seconds: Math.round(elapsed / Math.max(total, 1)),
        difficulty: 2, time_bonus_pct: timeBonusPct,
      }),
    })
    const data = await res.json()
    setResult({ finalScore, xpEarned: data.xp_earned ?? 0, coinsEarned: data.coins_earned ?? 0, levelUp: data.level_up ?? false, newLevel: data.new_level, bonusBreakdown: data.bonus_breakdown, rankUpReward: data.rank_up_reward })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setPhase('result')
  }

  function resetGame() {
    setNodes(generateMap())
    setCurrentNodeId(0)
    setHp(100)
    setScore(0)
    setCorrect(0)
    setTotal(0)
    setBossHp(BOSS_MAX_HP)
    setUsedIds(new Set())
    setReviveUsed(false)
    setReviveMsg('')
    setNotif('')
    setQuestion(null)
    setSelectedAnswer(null)
    setActiveEvent(null)
    setResult(null)
    setPhase('map')
  }

  const currentNode = nodes.find(n => n.id === currentNodeId)
  const accessibleSet = new Set(currentNode?.connections ?? [])

  if (phase === 'result' && result) {
    return (
      <GameShell title="Donjon" icon="🏰" branchColor={branchColor}>
        <ResultScreen
          score={result.finalScore} correct={correct} total={total}
          xpEarned={result.xpEarned} coinsEarned={result.coinsEarned}
          levelUp={result.levelUp} newLevel={result.newLevel}
          branchColor={branchColor} onReplay={resetGame} gameLabel="Donjon"
          bonusBreakdown={result.bonusBreakdown} rankUpReward={result.rankUpReward}
        />
        {unlockedAchievements.length > 0 && (
          <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
        )}
      </GameShell>
    )
  }

  return (
    <GameShell title="Donjon" icon="🏰" branchColor={branchColor}>
      {/* HUD */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center gap-3">
        <Heart size={16} className="text-red-400 flex-shrink-0" />
        <ProgressBar value={hp} max={maxHp} color={hp > 50 ? '#25C292' : hp > 25 ? '#F59E0B' : '#FF4D6A'} height={10} />
        <span className="text-sm text-gray-400 flex-shrink-0">{hp}/{maxHp}</span>
        <span className="text-sm text-gray-500 ml-auto">Score : <span style={{ color: branchColor }}>{score}</span></span>
        {hasRevive && <span className="text-xs text-purple-400 ml-2">🫁 Revive</span>}
      </div>

      {reviveMsg && (
        <div className="max-w-2xl mx-auto mb-3 p-3 rounded-xl text-purple-300 text-center text-sm animate-slide-up"
          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
          {reviveMsg}
        </div>
      )}
      {notif && (
        <div className="max-w-2xl mx-auto mb-3 p-3 rounded-xl text-center text-sm animate-slide-up"
          style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }}>
          {notif}
        </div>
      )}

      {/* ── MAP ─────────────────────────────────────────────────────── */}
      {phase === 'map' && (
        <div className="max-w-md mx-auto">
          <p className="text-center text-gray-600 text-xs uppercase tracking-widest mb-3">Carte du Donjon</p>
          <div className="rpg-card relative" style={{ height: 420 }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodes.map(node =>
                node.connections.map(connId => {
                  const child = nodes.find(n => n.id === connId)
                  if (!child) return null
                  const p = nodePos(node)
                  const c = nodePos(child)
                  const active = node.visited && accessibleSet.has(connId)
                  return (
                    <line key={`${node.id}-${connId}`}
                      x1={`${p.x}%`} y1={`${p.y}%`} x2={`${c.x}%`} y2={`${c.y}%`}
                      stroke={active ? `${branchColor}70` : node.visited ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={active ? 2.5 : 1.5}
                      strokeDasharray={active ? 'none' : '5,5'}
                    />
                  )
                })
              )}
            </svg>

            {nodes.map(node => {
              const pos = nodePos(node)
              const isAccessible = accessibleSet.has(node.id) && !node.visited
              const isCurrent = node.id === currentNodeId && node.visited
              const color = NODE_COLORS[node.type]
              return (
                <div key={node.id} className="absolute z-10"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-50%)' }}>
                  <button
                    onClick={() => isAccessible ? enterNode(node.id) : undefined}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200"
                    style={{
                      cursor: isAccessible ? 'pointer' : 'default',
                      background: node.visited ? 'rgba(255,255,255,0.03)' : isAccessible ? `${color}18` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${node.visited ? 'rgba(255,255,255,0.08)' : isAccessible ? color : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: isAccessible ? `0 0 14px ${color}55` : isCurrent ? `0 0 10px ${color}30` : 'none',
                      opacity: node.visited && !isCurrent ? 0.38 : isAccessible ? 1 : node.floor === 0 ? 1 : 0.3,
                      filter: node.type === 'boss' && isAccessible ? 'drop-shadow(0 0 10px rgba(255,77,106,0.7))' : 'none',
                    }}
                  >
                    {node.visited && !isCurrent
                      ? <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>✓</span>
                      : NODE_ICONS[node.type]
                    }
                  </button>
                  {isAccessible && (
                    <p className="text-center text-[10px] mt-0.5 font-semibold" style={{ color }}>
                      {NODE_LABELS[node.type]}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {(['combat', 'elite', 'rest', 'event', 'shop', 'boss'] as NodeType[]).map(t => (
              <span key={t} style={{ color: NODE_COLORS[t] }}>{NODE_ICONS[t]} {NODE_LABELS[t]}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── COMBAT / ELITE ──────────────────────────────────────────── */}
      {(phase === 'combat' || phase === 'elite') && question && (
        <div className="max-w-2xl mx-auto animate-slide-up">
          <div className="mb-4 p-3 rounded-xl flex items-center gap-3"
            style={{
              background: phase === 'elite' ? 'rgba(255,77,106,0.1)' : 'rgba(77,139,255,0.1)',
              border: `1px solid ${phase === 'elite' ? 'rgba(255,77,106,0.3)' : 'rgba(77,139,255,0.3)'}`,
            }}>
            <span className="text-2xl">{phase === 'elite' ? '💀' : '⚔️'}</span>
            <div>
              <p className="font-cinzel font-bold text-sm" style={{ color: phase === 'elite' ? '#FF4D6A' : '#4D8BFF' }}>
                {phase === 'elite' ? 'Salle Élite — Défi difficile' : 'Salle de Combat'}
              </p>
              <p className="text-gray-500 text-xs">
                {phase === 'elite' ? '+200 pts si correct · −30 HP si raté' : '+100 pts si correct · −20 HP si raté'}
              </p>
            </div>
          </div>
          <QuestionBlock
            question={question} selectedAnswer={selectedAnswer}
            onAnswer={(a) => handleAnswer(a, phase === 'elite', false)}
            onContinue={backToMap} branchColor={branchColor}
          />
        </div>
      )}

      {/* ── BOSS FIGHT ──────────────────────────────────────────────── */}
      {phase === 'boss_fight' && question && (
        <div className="max-w-2xl mx-auto animate-slide-up">
          <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">👑</span>
              <div>
                <p className="font-cinzel font-bold text-red-400 text-lg">BOSS FINAL</p>
                <p className="text-gray-500 text-xs">Infligez {BOSS_MAX_HP} bonnes réponses pour vaincre</p>
              </div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: BOSS_MAX_HP }).map((_, i) => (
                <div key={i} className="flex-1 h-3 rounded-full transition-all duration-300"
                  style={{ background: i < bossHp ? '#FF4D6A' : 'rgba(255,77,106,0.15)', border: '1px solid rgba(255,77,106,0.3)' }} />
              ))}
            </div>
          </div>
          <QuestionBlock
            question={question} selectedAnswer={selectedAnswer}
            onAnswer={(a) => handleAnswer(a, false, true)}
            onContinue={bossHp > 0 ? continueBoss : undefined}
            continueLabel={bossHp > 0 ? 'Continuer le combat →' : undefined}
            branchColor={branchColor}
          />
        </div>
      )}

      {/* ── REST ROOM ───────────────────────────────────────────────── */}
      {phase === 'rest' && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-8 text-center">
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="font-cinzel font-bold text-white text-xl mb-2">Salle de Repos</h3>
            <p className="text-gray-400 text-sm mb-6">Un feu de camp crépite dans l&apos;obscurité.<br />Profitez-en pour récupérer vos forces.</p>
            <div className="mb-6">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Heart size={14} className="text-red-400" />
                <span className="text-sm text-gray-400">{hp} / {maxHp} HP actuels</span>
              </div>
              <ProgressBar value={hp} max={maxHp} color={hp > 50 ? '#25C292' : '#F59E0B'} height={8} />
              <p className="text-green-400 text-sm mt-2">→ +30 HP après le repos</p>
            </div>
            <button onClick={doRest}
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #25C292, #1da77a)' }}>
              Se reposer ❤️
            </button>
          </div>
        </div>
      )}

      {/* ── EVENT ROOM ──────────────────────────────────────────────── */}
      {phase === 'event' && activeEvent && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-6">
            <h3 className="font-cinzel font-bold text-white text-lg mb-1">{activeEvent.title}</h3>
            <p className="text-gray-500 text-sm mb-6">Que faites-vous ?</p>
            <div className="space-y-3">
              {activeEvent.options.map((opt, i) => (
                <button key={i} onClick={() => handleEventChoice(opt)}
                  className="w-full text-left p-4 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-white text-sm font-medium">{opt.label}</span>
                  {opt.risky && <span className="ml-2 text-xs text-orange-400">⚠️ Risqué</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SHOP ROOM ───────────────────────────────────────────────── */}
      {phase === 'shop' && (
        <div className="max-w-md mx-auto animate-slide-up">
          <div className="rpg-card p-6">
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🛒</div>
              <h3 className="font-cinzel font-bold text-white text-xl">Marché du Donjon</h3>
              <p className="text-gray-500 text-sm">Choisissez une amélioration gratuite</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => doShop('heal')}
                className="w-full p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(37,194,146,0.08)', border: '1px solid rgba(37,194,146,0.25)' }}>
                <span className="text-3xl">🧪</span>
                <div className="text-left">
                  <p className="text-green-400 font-semibold text-sm">Grande Potion de Vie</p>
                  <p className="text-gray-500 text-xs">Restaure +40 HP</p>
                </div>
              </button>
              <button onClick={() => doShop('score')}
                className="w-full p-4 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)' }}>
                <span className="text-3xl">📚</span>
                <div className="text-left">
                  <p className="font-semibold text-sm" style={{ color: '#D4A843' }}>Grimoire de Sagesse</p>
                  <p className="text-gray-500 text-xs">+300 points de score</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEAD ────────────────────────────────────────────────────── */}
      {phase === 'dead' && (
        <div className="max-w-md mx-auto text-center animate-slide-up">
          <div className="rpg-card p-8">
            <div className="text-6xl mb-4">💀</div>
            <h3 className="font-cinzel font-bold text-red-400 text-2xl mb-2">Vous êtes tombé</h3>
            <p className="text-gray-400 text-sm mb-4">Le donjon vous a vaincu…</p>
            <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-gray-400 text-sm">Score final</p>
              <p className="text-3xl font-bold text-white mt-1">{Math.round(score * 0.5)}</p>
              <p className="text-gray-600 text-xs mt-1">(×0.5 — défaite)</p>
            </div>
            <button onClick={() => finishGame(false)}
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm"
              style={{ background: 'rgba(255,77,106,0.2)', border: '1px solid rgba(255,77,106,0.4)', color: '#FF4D6A' }}>
              Voir les récompenses
            </button>
          </div>
        </div>
      )}

      {/* ── VICTORY ─────────────────────────────────────────────────── */}
      {phase === 'victory' && (
        <div className="max-w-md mx-auto text-center animate-slide-up">
          <div className="rpg-card p-8">
            <div className="text-6xl mb-4 animate-float">🏆</div>
            <h3 className="font-cinzel font-bold text-2xl mb-2" style={{ color: branchColor }}>Boss vaincu !</h3>
            <p className="text-gray-400 text-sm mb-4">Vous avez conquis le donjon.</p>
            <div className="p-4 rounded-xl mb-6" style={{ background: `${branchColor}10`, border: `1px solid ${branchColor}30` }}>
              <p className="text-gray-400 text-sm">Score final</p>
              <p className="text-3xl font-bold text-white mt-1">{score + 500}</p>
              <p className="text-xs mt-1" style={{ color: branchColor }}>+500 bonus victoire</p>
            </div>
            <button onClick={() => finishGame(true)}
              className="w-full py-3 rounded-xl font-cinzel font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12' }}>
              Réclamer les récompenses 🏆
            </button>
          </div>
        </div>
      )}

      {unlockedAchievements.length > 0 && (
        <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
      )}
    </GameShell>
  )
}

// ─── QuestionBlock ───────────────────────────────────────────────────────────

function QuestionBlock({ question, selectedAnswer, onAnswer, onContinue, continueLabel, branchColor }: {
  question: Question
  selectedAnswer: string | null
  onAnswer: (a: string) => void
  onContinue?: () => void
  continueLabel?: string
  branchColor: string
}) {
  const answered = !!selectedAnswer

  return (
    <div>
      {question.context && (
        <div className="mb-4 p-3 rounded-xl text-gray-400 text-sm italic"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {question.context}
        </div>
      )}
      <div className="rpg-card p-5 mb-4">
        <p className="text-white font-medium leading-relaxed">{question.question}</p>
      </div>
      <div className="space-y-2 mb-4">
        {question.answers.map((a, i) => {
          let bg = 'rgba(255,255,255,0.04)'
          let border = '1px solid rgba(255,255,255,0.10)'
          let color = ''
          let opacity = 1
          if (answered) {
            if (a === question.correct_answer) { bg = 'rgba(37,194,146,0.15)'; border = '1px solid rgba(37,194,146,0.5)'; color = '#25C292' }
            else if (a === selectedAnswer) { bg = 'rgba(255,77,106,0.15)'; border = '1px solid rgba(255,77,106,0.5)'; color = '#FF4D6A' }
            else opacity = 0.4
          }
          return (
            <button key={i} onClick={() => !answered && onAnswer(a)} disabled={answered}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 disabled:cursor-default"
              style={{ background: bg, border, color: color || undefined, opacity }}>
              {a}
            </button>
          )
        })}
      </div>
      {answered && selectedAnswer !== question.correct_answer && (
        <div className="mb-4 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#9CA3AF' }}>
          Bonne réponse : <span className="text-green-400 font-medium">{question.correct_answer}</span>
        </div>
      )}
      {answered && onContinue && (
        <button onClick={onContinue}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ background: branchColor, color: '#080A12' }}>
          {continueLabel ?? 'Retour à la carte →'}
        </button>
      )}
    </div>
  )
}
