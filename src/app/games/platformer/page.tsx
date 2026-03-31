'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { QuestionWithAnswers } from '@/types'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

// ── Constants ───────────────────────────────────────────────
const W = 800
const H = 450
const COIN_SIZE = 14
const PLAYER_W = 28
const PLAYER_H = 36
const PLATFORM_H = 14

interface Platform { x: number; y: number; w: number }
interface Coin    { x: number; y: number; collected: boolean; hasQuestion: boolean; qIndex: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

interface GameState {
  px: number; py: number
  pvx: number; pvy: number
  onGround: boolean
  scrollX: number
  coinsCollected: number
  score: number
  alive: boolean
  platforms: Platform[]
  coins: Coin[]
  particles: Particle[]
  qCount: number
  gravity: number
  moveSpeed: number
  jumpForce: number
  scoreMult: number
  // Double jump
  jumpsLeft: number
  // Dash
  dashCooldown: number
  isDashing: boolean
  dashVx: number
  dashFrames: number
  facingRight: boolean
}

// ── Level configs ────────────────────────────────────────────
interface LevelConfig {
  id: number
  name: string
  subtitle: string
  icon: string
  color: string
  difficulty: 1 | 2 | 3
  questionCount: number
  gravity: number
  moveSpeed: number
  jumpForce: number
  worldWidth: number
  xpBonus: number
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Les Fondations',
    subtitle: 'Les bases des marchés financiers',
    icon: '🌿',
    color: '#25C292',
    difficulty: 1,
    questionCount: 8,
    gravity: 0.5,
    moveSpeed: 4.5,
    jumpForce: -13,
    worldWidth: 2800,
    xpBonus: 100,
  },
  {
    id: 2,
    name: 'Réglementation',
    subtitle: 'Conformité et règles AMF',
    icon: '⚖️',
    color: '#4D8BFF',
    difficulty: 2,
    questionCount: 12,
    gravity: 0.58,
    moveSpeed: 4.5,
    jumpForce: -13.5,
    worldWidth: 3800,
    xpBonus: 250,
  },
  {
    id: 3,
    name: 'Expert AMF',
    subtitle: 'Réservé aux meilleurs analystes',
    icon: '🔥',
    color: '#FF4D6A',
    difficulty: 3,
    questionCount: 16,
    gravity: 0.65,
    moveSpeed: 4.2,
    jumpForce: -14,
    worldWidth: 5000,
    xpBonus: 500,
  },
]

// ── World generators ─────────────────────────────────────────
function generateLevel1(): Pick<GameState, 'platforms' | 'coins'> {
  const platforms: Platform[] = [
    { x: 0,    y: H - 30,  w: 300 },
    { x: 340,  y: H - 90,  w: 180 },
    { x: 560,  y: H - 30,  w: 200 },
    { x: 800,  y: H - 140, w: 160 },
    { x: 1010, y: H - 30,  w: 220 },
    { x: 1270, y: H - 110, w: 150 },
    { x: 1460, y: H - 30,  w: 200 },
    { x: 1700, y: H - 160, w: 180 },
    { x: 1930, y: H - 30,  w: 300 },
    { x: 2270, y: H - 130, w: 160 },
    { x: 2480, y: H - 30,  w: 300 },
  ]
  return buildCoins(platforms, 8)
}

function generateLevel2(): Pick<GameState, 'platforms' | 'coins'> {
  const platforms: Platform[] = [
    { x: 0,    y: H - 30,  w: 250 },
    { x: 310,  y: H - 110, w: 120 },
    { x: 480,  y: H - 30,  w: 150 },
    { x: 680,  y: H - 160, w: 100 },
    { x: 830,  y: H - 80,  w: 130 },
    { x: 1010, y: H - 30,  w: 180 },
    { x: 1240, y: H - 180, w: 100 },
    { x: 1390, y: H - 100, w: 120 },
    { x: 1560, y: H - 30,  w: 160 },
    { x: 1780, y: H - 200, w: 90  },
    { x: 1930, y: H - 110, w: 130 },
    { x: 2120, y: H - 30,  w: 150 },
    { x: 2330, y: H - 150, w: 110 },
    { x: 2500, y: H - 60,  w: 120 },
    { x: 2680, y: H - 30,  w: 200 },
    { x: 2950, y: H - 170, w: 100 },
    { x: 3150, y: H - 30,  w: 300 },
                                        // flag platform
    { x: 3620, y: H - 30,  w: 200 },
  ]
  return buildCoins(platforms, 12)
}

function generateLevel3(): Pick<GameState, 'platforms' | 'coins'> {
  const platforms: Platform[] = [
    { x: 0,    y: H - 30,  w: 200 },
    { x: 260,  y: H - 130, w: 80  },
    { x: 400,  y: H - 200, w: 70  },
    { x: 530,  y: H - 130, w: 80  },
    { x: 660,  y: H - 30,  w: 120 },
    { x: 850,  y: H - 180, w: 70  },
    { x: 990,  y: H - 100, w: 90  },
    { x: 1140, y: H - 220, w: 70  },
    { x: 1280, y: H - 140, w: 80  },
    { x: 1420, y: H - 30,  w: 120 },
    { x: 1610, y: H - 200, w: 70  },
    { x: 1750, y: H - 120, w: 80  },
    { x: 1900, y: H - 250, w: 60  },
    { x: 2040, y: H - 170, w: 80  },
    { x: 2200, y: H - 30,  w: 130 },
    { x: 2400, y: H - 160, w: 70  },
    { x: 2540, y: H - 80,  w: 90  },
    { x: 2700, y: H - 220, w: 65  },
    { x: 2840, y: H - 140, w: 80  },
    { x: 3020, y: H - 30,  w: 150 },
    { x: 3250, y: H - 200, w: 70  },
    { x: 3400, y: H - 110, w: 85  },
    { x: 3560, y: H - 260, w: 60  },
    { x: 3700, y: H - 170, w: 75  },
    { x: 3900, y: H - 30,  w: 200 },
    // Boss platform
    { x: 4600, y: H - 80,  w: 400 },
    { x: 4700, y: H - 30,  w: 600 },
  ]
  return buildCoins(platforms, 16)
}

function buildCoins(platforms: Platform[], maxQ: number): Pick<GameState, 'platforms' | 'coins'> {
  const coins: Coin[] = []
  let qIdx = 0
  platforms.forEach(p => {
    const count = Math.floor(p.w / 55)
    for (let i = 0; i < count; i++) {
      const hasQ = (coins.length + 1) % 3 === 0 && qIdx < maxQ
      coins.push({
        x: p.x + 30 + i * 55,
        y: p.y - 36,
        collected: false,
        hasQuestion: hasQ,
        qIndex: hasQ ? qIdx++ : -1,
      })
    }
  })
  return { platforms, coins }
}

// ── Upgrade system ───────────────────────────────────────────
interface Upgrade {
  id: string
  icon: string
  name: string
  desc: string
  apply: (s: Partial<GameState>) => Partial<GameState>
  stackable: boolean
  maxStack: number
}

const ALL_UPGRADES: Upgrade[] = [
  {
    id: 'speed',
    icon: '⚡',
    name: 'Agilité',
    desc: '+0.5 vitesse de déplacement',
    apply: s => ({ moveSpeed: Math.min((s.moveSpeed ?? 4.5) + 0.5, 7) }),
    stackable: true,
    maxStack: 5,
  },
  {
    id: 'jump',
    icon: '🦘',
    name: 'Saut Amélioré',
    desc: '+1 force de saut',
    apply: s => ({ jumpForce: Math.max((s.jumpForce ?? -13) - 1, -17) }),
    stackable: true,
    maxStack: 4,
  },
  {
    id: 'score',
    icon: '✨',
    name: 'Collecteur',
    desc: '+50% score des pièces',
    apply: s => ({ scoreMult: Math.min((s.scoreMult ?? 1) + 0.5, 3) }),
    stackable: true,
    maxStack: 4,
  },
  {
    id: 'gravity',
    icon: '🌙',
    name: 'Légèreté',
    desc: 'Gravité réduite',
    apply: s => ({ gravity: Math.max((s.gravity ?? 0.55) - 0.08, 0.25) }),
    stackable: true,
    maxStack: 3,
  },
]

interface SavedUpgrades { speed?: number; jump?: number; score?: number; gravity?: number }

function loadUpgrades(): SavedUpgrades {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('platformer_upgrades') ?? '{}') } catch { return {} }
}

function saveUpgrades(u: SavedUpgrades) {
  if (typeof window === 'undefined') return
  localStorage.setItem('platformer_upgrades', JSON.stringify(u))
}

function getUnlockedLevel(): number {
  if (typeof window === 'undefined') return 1
  return parseInt(localStorage.getItem('platformer_max_level') ?? '1')
}

function unlockNextLevel(current: number) {
  const next = current + 1
  if (next <= LEVELS.length) {
    const unlocked = getUnlockedLevel()
    if (next > unlocked) localStorage.setItem('platformer_max_level', String(next))
  }
}

function applyUpgradesToLevel(level: LevelConfig, upgrades: SavedUpgrades): Partial<GameState> {
  return {
    gravity: level.gravity - (upgrades.gravity ?? 0),
    moveSpeed: level.moveSpeed + (upgrades.speed ?? 0),
    jumpForce: level.jumpForce - (upgrades.jump ?? 0),
    scoreMult: 1 + (upgrades.score ?? 0),
  }
}

function pickRandomUpgrades(upgrades: SavedUpgrades): Upgrade[] {
  const stacks: Record<string, number> = {
    speed: Math.round((upgrades.speed ?? 0) / 0.5),
    jump: Math.round((upgrades.jump ?? 0)),
    score: Math.round((upgrades.score ?? 0) / 0.5),
    gravity: Math.round((upgrades.gravity ?? 0) / 0.08),
  }
  const available = ALL_UPGRADES.filter(u => stacks[u.id] < u.maxStack)
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(3, shuffled.length))
}

// ── Main component ───────────────────────────────────────────
type AppPhase = 'select' | 'playing' | 'upgrade' | 'done'

export default function PlatformerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const stateRef = useRef<GameState | null>(null)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)
  // Track "just pressed" for jump and dash to avoid holding issues
  const jumpQueueRef = useRef(false)
  const dashQueueRef = useRef(false)

  const [appPhase, setAppPhase] = useState<AppPhase>('select')
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null)
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [loadingQ, setLoadingQ] = useState(false)

  const [activeQuestion, setActiveQuestion] = useState<QuestionWithAnswers | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null)

  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [finalCoins, setFinalCoins] = useState(0)
  const [finalQCount, setFinalQCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const [upgrades, setUpgrades] = useState<SavedUpgrades>({})
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([])
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [runReward, setRunReward] = useState<{ xp: number; coins: number; levelUp: boolean } | null>(null)
  const [unlockedLevelId, setUnlockedLevelId] = useState<number | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')

  // Load upgrades and branch color on mount
  useEffect(() => {
    setUpgrades(loadUpgrades())
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    }).catch(() => {})
  }, [])

  // ── Start a level ─────────────────────────────────────────
  async function startLevel(level: LevelConfig) {
    setSelectedLevel(level)
    setLoadingQ(true)
    setGameOver(false)
    setGameWon(false)
    setCorrectCount(0)

    const data = await fetch(`/api/game/questions?game=quiz&count=${level.questionCount}&difficulty=${level.difficulty}`)
      .then(r => r.json())
    const qs: QuestionWithAnswers[] = data.questions ?? []
    setQuestions(qs)
    setLoadingQ(false)

    const currentUpgrades = loadUpgrades()
    setUpgrades(currentUpgrades)

    const base = level.id === 1 ? generateLevel1() : level.id === 2 ? generateLevel2() : generateLevel3()
    const applied = applyUpgradesToLevel(level, currentUpgrades)

    stateRef.current = {
      px: 60, py: H - 30 - PLAYER_H,
      pvx: 0, pvy: 0,
      onGround: false,
      scrollX: 0,
      coinsCollected: 0,
      score: 0,
      alive: true,
      ...base,
      particles: [],
      qCount: 0,
      gravity: applied.gravity ?? level.gravity,
      moveSpeed: applied.moveSpeed ?? level.moveSpeed,
      jumpForce: applied.jumpForce ?? level.jumpForce,
      scoreMult: applied.scoreMult ?? 1,
      // Double jump + dash
      jumpsLeft: 2,
      dashCooldown: 0,
      isDashing: false,
      dashVx: 0,
      dashFrames: 0,
      facingRight: true,
    }
    jumpQueueRef.current = false
    dashQueueRef.current = false

    setAppPhase('playing')
  }

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      // Queue jump on fresh keydown (prevents hold-to-repeat double jump)
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        jumpQueueRef.current = true
      }
      // Queue dash on fresh keydown
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        dashQueueRef.current = true
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ── Draw ──────────────────────────────────────────────────
  const draw = useCallback((level: LevelConfig) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background based on level
    const bgColors: Record<number, [string, string]> = {
      1: ['#080A12', '#0D1A1F'],
      2: ['#080A1A', '#081228'],
      3: ['#120808', '#1A0810'],
    }
    const [bgA, bgB] = bgColors[level.id] ?? bgColors[1]
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, bgA)
    grad.addColorStop(1, bgB)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Stars
    ctx.fillStyle = level.id === 3 ? 'rgba(255,100,100,0.25)' : 'rgba(255,255,255,0.25)'
    for (let i = 0; i < 70; i++) {
      ctx.fillRect(((i * 137 + 50) % W), ((i * 97 + 30) % (H * 0.8)), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1)
    }

    const ox = state.scrollX

    // Platforms
    const platColor = level.id === 1 ? ['#1A3A2A', '#0D2A1A'] : level.id === 2 ? ['#2A3A6A', '#1A2550'] : ['#3A1A1A', '#2A0D0D']
    state.platforms.forEach(p => {
      const sx = p.x - ox
      if (sx + p.w < 0 || sx > W) return
      const pg = ctx.createLinearGradient(sx, p.y, sx, p.y + PLATFORM_H)
      pg.addColorStop(0, platColor[0])
      pg.addColorStop(1, platColor[1])
      ctx.fillStyle = pg
      ctx.fillRect(sx, p.y, p.w, PLATFORM_H)
      ctx.fillStyle = `${level.color}60`
      ctx.fillRect(sx, p.y, p.w, 2)
    })

    // Coins
    state.coins.forEach(c => {
      if (c.collected) return
      const sx = c.x - ox
      if (sx < -20 || sx > W + 20) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(sx + COIN_SIZE / 2, c.y + COIN_SIZE / 2, COIN_SIZE / 2, 0, Math.PI * 2)
      ctx.fillStyle = c.hasQuestion ? level.color : '#D4A843'
      ctx.shadowColor = c.hasQuestion ? level.color : '#D4A843'
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.restore()
      if (c.hasQuestion) {
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('?', sx + COIN_SIZE / 2, c.y + COIN_SIZE / 2 + 3)
      }
    })

    // Particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life / 20
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - ox, p.y, 4, 4)
    })
    ctx.globalAlpha = 1

    // Finish flag
    const lastP = state.platforms[state.platforms.length - 1]
    const flagX = lastP.x + lastP.w - 40 - ox
    if (flagX > -40 && flagX < W + 40) {
      ctx.fillStyle = '#D4A843'
      ctx.fillRect(flagX, lastP.y - 60, 3, 60)
      ctx.fillStyle = '#D4A843'
      ctx.beginPath()
      ctx.moveTo(flagX + 3, lastP.y - 60)
      ctx.lineTo(flagX + 28, lastP.y - 48)
      ctx.lineTo(flagX + 3, lastP.y - 36)
      ctx.fill()
    }

    // Player
    const psx = state.px - ox
    const bodyGrad = ctx.createLinearGradient(psx, state.py, psx + PLAYER_W, state.py + PLAYER_H)
    bodyGrad.addColorStop(0, '#D4A843')
    bodyGrad.addColorStop(1, '#B8892A')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.roundRect(psx, state.py, PLAYER_W, PLAYER_H, 5)
    ctx.fill()
    ctx.fillStyle = '#080A12'
    ctx.beginPath(); ctx.arc(psx + 8,  state.py + 12, 3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(psx + 20, state.py + 12, 3, 0, Math.PI * 2); ctx.fill()

    // Player: dash glow
    if (state.isDashing) {
      ctx.shadowColor = level.color
      ctx.shadowBlur = 18
      const dashGrad = ctx.createLinearGradient(psx, state.py, psx + PLAYER_W, state.py + PLAYER_H)
      dashGrad.addColorStop(0, level.color)
      dashGrad.addColorStop(1, '#ffffff80')
      ctx.fillStyle = dashGrad
      ctx.beginPath()
      ctx.roundRect(psx, state.py, PLAYER_W, PLAYER_H, 5)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, 36)
    ctx.fillStyle = '#D4A843'
    ctx.font = 'bold 13px "Cinzel", serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${state.score}`, 16, 23)
    ctx.fillStyle = level.color
    ctx.textAlign = 'center'
    ctx.fillText(`Pièces: ${state.coinsCollected}`, W / 2, 23)
    ctx.fillStyle = '#25C292'
    ctx.textAlign = 'right'
    ctx.fillText(`Q: ${state.qCount}`, W - 16, 23)

    // Double jump indicator (top-right corner)
    const jumpIconX = W - 80
    const jumpIconY = 44
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = j < state.jumpsLeft ? '#FFD700' : 'rgba(255,215,0,0.2)'
      ctx.beginPath()
      ctx.arc(jumpIconX + j * 14, jumpIconY, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('2-SAUT', W - 16, jumpIconY + 4)

    // Dash cooldown bar (top-right below jump)
    const dashBarY = jumpIconY + 14
    const dashBarW = 64
    const dashFill = state.dashCooldown === 0 ? dashBarW : Math.max(0, dashBarW - (state.dashCooldown / 45) * dashBarW)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(W - 16 - dashBarW, dashBarY, dashBarW, 5)
    ctx.fillStyle = state.dashCooldown === 0 ? level.color : 'rgba(255,255,255,0.3)'
    ctx.fillRect(W - 16 - dashBarW, dashBarY, dashFill, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('DASH', W - 16, dashBarY + 13)
  }, [])

  // ── Game loop ─────────────────────────────────────────────
  const loop = useCallback(() => {
    const state = stateRef.current
    if (!state || !state.alive || pausedRef.current || !selectedLevel) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }

    const keys = keysRef.current

    // ── Dash ──────────────────────────────────────────────────
    if (state.dashCooldown > 0) state.dashCooldown--

    if (dashQueueRef.current && state.dashCooldown === 0 && !state.isDashing) {
      const dir = (keys.has('ArrowLeft') || keys.has('KeyA')) ? -1 : 1
      state.isDashing   = true
      state.dashVx      = dir * state.moveSpeed * 3.5
      state.dashFrames  = 10     // dash lasts 10 frames
      state.dashCooldown = 45    // 45-frame cooldown (~0.75s)
      state.pvy = 0              // cancel vertical momentum
      // Visual feedback: spawn dash particles
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: state.px + PLAYER_W / 2,
          y: state.py + PLAYER_H / 2,
          vx: -dir * (Math.random() * 3 + 1),
          vy: (Math.random() - 0.5) * 2,
          life: 14,
          color: selectedLevel?.color ?? '#4D8BFF',
        })
      }
    }
    dashQueueRef.current = false

    if (state.isDashing) {
      state.pvx = state.dashVx
      state.dashFrames--
      if (state.dashFrames <= 0) {
        state.isDashing = false
        state.dashVx = 0
      }
    } else {
      if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        state.pvx = -state.moveSpeed
        state.facingRight = false
      } else if (keys.has('ArrowRight') || keys.has('KeyD')) {
        state.pvx = state.moveSpeed
        state.facingRight = true
      } else {
        state.pvx = 0
      }
    }

    // ── Double jump ───────────────────────────────────────────
    if (jumpQueueRef.current && state.jumpsLeft > 0 && !state.isDashing) {
      state.pvy = state.jumpsLeft === 2 ? state.jumpForce : state.jumpForce * 0.85
      state.jumpsLeft--
      state.onGround = false
      // Air-jump particles
      if (state.jumpsLeft === 0) {
        for (let i = 0; i < 10; i++) {
          state.particles.push({
            x: state.px + PLAYER_W / 2,
            y: state.py + PLAYER_H,
            vx: (Math.random() - 0.5) * 5,
            vy: Math.random() * 3 + 1,
            life: 18,
            color: '#FFD700',
          })
        }
      }
    }
    jumpQueueRef.current = false

    // ── Physics ───────────────────────────────────────────────
    if (!state.isDashing) state.pvy += state.gravity
    state.px += state.pvx
    state.py += state.pvy

    state.onGround = false
    state.platforms.forEach(p => {
      if (
        state.px + PLAYER_W > p.x &&
        state.px < p.x + p.w &&
        state.py + PLAYER_H > p.y &&
        state.py + PLAYER_H < p.y + PLATFORM_H + 12 &&
        state.pvy >= 0
      ) {
        state.py = p.y - PLAYER_H
        state.pvy = 0
        if (!state.onGround) {
          state.onGround = true
          state.jumpsLeft = 2   // Restore double jump on landing
          state.isDashing = false
        }
      }
    })

    if (state.py > H + 60) {
      state.py = H - 30 - PLAYER_H
      state.px = Math.max(60, state.scrollX + 60)
      state.pvy = 0
      state.jumpsLeft = 2
      state.isDashing = false
    }

    if (state.px < state.scrollX + 80) state.px = state.scrollX + 80

    const lastPlatform = state.platforms[state.platforms.length - 1]
    const worldEnd = lastPlatform.x + lastPlatform.w

    const targetScroll = state.px - W * 0.4
    state.scrollX = Math.max(0, Math.min(targetScroll, worldEnd - W))

    // Coin collection
    state.coins.forEach(c => {
      if (c.collected) return
      if (
        state.px < c.x + COIN_SIZE && state.px + PLAYER_W > c.x &&
        state.py < c.y + COIN_SIZE && state.py + PLAYER_H > c.y
      ) {
        c.collected = true
        state.coinsCollected++
        state.score += Math.round(10 * state.scoreMult)
        for (let i = 0; i < 6; i++) {
          state.particles.push({
            x: c.x + COIN_SIZE / 2, y: c.y,
            vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1,
            life: 20, color: c.hasQuestion ? (selectedLevel?.color ?? '#4D8BFF') : '#D4A843',
          })
        }
        if (c.hasQuestion && c.qIndex >= 0 && c.qIndex < questions.length) {
          pausedRef.current = true
          setActiveQuestion(questions[c.qIndex])
        }
      }
    })

    state.particles = state.particles.filter(p => p.life > 0)
    state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life-- })

    // Win condition
    if (state.px >= worldEnd - 60) {
      state.alive = false
      setFinalScore(state.score)
      setFinalCoins(state.coinsCollected)
      setFinalQCount(state.qCount)
      setGameWon(true)
    }

    draw(selectedLevel)
    rafRef.current = requestAnimationFrame(loop)
  }, [draw, questions, selectedLevel])

  // Start/stop loop
  useEffect(() => {
    if (appPhase !== 'playing' || loadingQ) return
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [appPhase, loadingQ, loop])

  // ── Answer handling ───────────────────────────────────────
  function handleAnswer(answerId: string) {
    if (!activeQuestion || answerResult) return
    setSelectedAnswer(answerId)
    const correct = activeQuestion.answers.find(a => a.is_correct)?.id === answerId
    setAnswerResult(correct ? 'correct' : 'wrong')
    if (correct) setCorrectCount(c => c + 1)
    if (stateRef.current) {
      stateRef.current.score += correct ? Math.round(50 * (stateRef.current.scoreMult ?? 1)) : 0
      stateRef.current.qCount++
    }
  }

  function closeQuestion() {
    setActiveQuestion(null)
    setSelectedAnswer(null)
    setAnswerResult(null)
    pausedRef.current = false
  }

  // ── Submit score & show upgrades ──────────────────────────
  useEffect(() => {
    if (!gameWon || !selectedLevel) return
    cancelAnimationFrame(rafRef.current)

    // Submit score
    fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'platformer',
        score: finalScore,
        questions_total: selectedLevel.questionCount,
        questions_correct: correctCount,
        best_streak: 0,
        avg_time_seconds: 0,
        difficulty: selectedLevel.difficulty,
      }),
    }).then(r => r.json()).then(data => {
      if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
      if (data.xp_earned) setRunReward({ xp: data.xp_earned, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false })
    }).catch(() => {})

    // Unlock next level
    unlockNextLevel(selectedLevel.id)
    if (selectedLevel.id < LEVELS.length) {
      setUnlockedLevelId(selectedLevel.id + 1)
    }

    // Show upgrade choices
    const savedUpgrades = loadUpgrades()
    const choices = pickRandomUpgrades(savedUpgrades)
    setUpgradeChoices(choices)

    if (choices.length > 0) {
      setAppPhase('upgrade')
    } else {
      setAppPhase('done')
    }
  }, [gameWon])

  function applyUpgrade(upgrade: Upgrade) {
    const current = loadUpgrades()
    const tempState: Partial<GameState> = {
      moveSpeed: current.speed !== undefined ? 4.5 + current.speed : 4.5,
      jumpForce: current.jump !== undefined ? -13 - current.jump : -13,
      scoreMult: current.score !== undefined ? 1 + current.score : 1,
      gravity:   current.gravity !== undefined ? 0.55 - current.gravity : 0.55,
    }
    const updated = upgrade.apply(tempState)
    const newUpgrades: SavedUpgrades = {
      speed:   updated.moveSpeed !== undefined ? updated.moveSpeed - 4.5 : (current.speed ?? 0),
      jump:    updated.jumpForce !== undefined ? -(updated.jumpForce + 13) : (current.jump ?? 0),
      score:   updated.scoreMult !== undefined ? updated.scoreMult - 1 : (current.score ?? 0),
      gravity: updated.gravity !== undefined ? 0.55 - updated.gravity : (current.gravity ?? 0),
    }
    saveUpgrades(newUpgrades)
    setUpgrades(newUpgrades)
    setAppPhase('done')
  }

  // Touch controls
  function touchLeft(down: boolean) { if (down) keysRef.current.add('ArrowLeft'); else keysRef.current.delete('ArrowLeft') }
  function touchRight(down: boolean) { if (down) keysRef.current.add('ArrowRight'); else keysRef.current.delete('ArrowRight') }
  function touchJump() { jumpQueueRef.current = true }
  function touchDash() { dashQueueRef.current = true }

  // ── RENDER ────────────────────────────────────────────────
  const unlockedMax = getUnlockedLevel()

  // Level select
  if (appPhase === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🕹️</div>
          <h1 className="font-cinzel text-2xl font-bold text-white">Plateforme AMF</h1>
          <p className="text-gray-500 text-sm mt-1">Termine chaque niveau pour débloquer le suivant</p>
        </div>

        {/* Upgrades summary */}
        {(upgrades.speed || upgrades.jump || upgrades.score || upgrades.gravity) && (
          <div className="rpg-card p-3 flex gap-3 text-xs text-gray-400">
            <span className="font-semibold text-gray-300">Améliorations actives:</span>
            {upgrades.speed ? <span>⚡ +{(upgrades.speed * 10).toFixed(0)}% vitesse</span> : null}
            {upgrades.jump ? <span>🦘 +{upgrades.jump} saut</span> : null}
            {upgrades.score ? <span>✨ ×{(1 + (upgrades.score ?? 0)).toFixed(1)} score</span> : null}
            {upgrades.gravity ? <span>🌙 gravité réduite</span> : null}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {LEVELS.map(level => {
            const isUnlocked = level.id <= unlockedMax
            const isCompleted = level.id < unlockedMax
            return (
              <button
                key={level.id}
                onClick={() => isUnlocked && startLevel(level)}
                disabled={!isUnlocked}
                className="rpg-card p-5 text-left transition-all duration-200 relative overflow-hidden"
                style={{
                  border: `1px solid ${isUnlocked ? level.color + '50' : 'rgba(255,255,255,0.05)'}`,
                  opacity: isUnlocked ? 1 : 0.5,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  boxShadow: isUnlocked ? `0 0 20px ${level.color}15` : 'none',
                }}
              >
                {isCompleted && (
                  <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                    ✓ Terminé
                  </div>
                )}
                {!isUnlocked && (
                  <div className="absolute top-2 right-2 text-lg">🔒</div>
                )}
                <div className="text-3xl mb-3">{level.icon}</div>
                <p className="font-cinzel font-bold text-white text-sm mb-0.5">{level.name}</p>
                <p className="text-gray-500 text-xs mb-3">{level.subtitle}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${level.color}20`, color: level.color, border: `1px solid ${level.color}30` }}>
                    Niv.{level.id}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded text-gray-500" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    +{level.xpBonus} XP bonus
                  </span>
                </div>
                {isUnlocked && (
                  <div className="mt-3 text-xs text-gray-600">
                    {level.questionCount} questions · diff.{level.difficulty}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => { saveUpgrades({}); setUpgrades({}) }}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Réinitialiser les améliorations
        </button>
      </div>
    )
  }

  // Upgrade screen (Cult of the Lamb style)
  if (appPhase === 'upgrade') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-6">
        <div className="text-center animate-slide-up">
          <div className="text-5xl mb-3">🏕️</div>
          <h2 className="font-cinzel text-2xl font-bold text-[#D4A843]">Niveau {selectedLevel?.id} terminé!</h2>
          <p className="text-gray-400 text-sm mt-1">Choisis une amélioration permanente pour les prochaines runs</p>
          {unlockedLevelId && (
            <p className="text-green-400 text-sm mt-2 font-semibold animate-pulse">
              🔓 Niveau {unlockedLevelId} débloqué!
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {upgradeChoices.map(upg => (
            <button
              key={upg.id}
              onClick={() => applyUpgrade(upg)}
              className="rpg-card p-6 text-center transition-all duration-200 hover:scale-[1.03] cursor-pointer"
              style={{ border: '1px solid rgba(212,168,67,0.25)', background: 'rgba(212,168,67,0.05)' }}
            >
              <div className="text-4xl mb-3">{upg.icon}</div>
              <p className="font-cinzel font-bold text-white mb-1">{upg.name}</p>
              <p className="text-gray-400 text-sm">{upg.desc}</p>
              <div className="mt-3 text-xs text-[#D4A843] font-semibold">Choisir →</div>
            </button>
          ))}
        </div>

        <button onClick={() => setAppPhase('done')} className="text-xs text-gray-600 hover:text-gray-400">
          Passer
        </button>
      </div>
    )
  }

  // Done screen
  if (appPhase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-5">
        <div className="text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="font-cinzel text-2xl font-bold text-[#D4A843]">Run terminée!</h2>
          <p className="text-gray-400 text-sm mt-1">Score final : <span className="text-white font-bold">{finalScore}</span></p>
          <p className="text-gray-500 text-xs mt-1">{finalCoins} pièces · {finalQCount} questions</p>
          {runReward && (
            <div className="mt-3 flex items-center justify-center gap-4">
              <span className="text-[#D4A843] font-bold">+{runReward.xp} XP</span>
              <span className="text-gray-500">·</span>
              <span className="text-amber-400 font-bold">+{runReward.coins} 💰</span>
              {runReward.levelUp && <span className="text-green-400 font-bold animate-pulse">⬆️ Niveau sup!</span>}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setAppPhase('select'); setGameWon(false); setGameOver(false) }}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Sélection niveau
          </button>
          {selectedLevel && (
            <button
              onClick={() => startLevel(selectedLevel)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
            >
              Rejouer →
            </button>
          )}
        </div>
        <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
      </div>
    )
  }

  // Playing
  if (loadingQ) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">🕹️</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">Chargement du niveau {selectedLevel?.id}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
      <div className="relative" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl border border-white/10 w-full"
          style={{ imageRendering: 'pixelated', maxHeight: '60vh', objectFit: 'contain' }}
        />

        {/* Level badge */}
        {selectedLevel && (
          <div className="absolute top-10 left-2 px-2 py-1 rounded text-xs font-cinzel font-bold"
            style={{ background: `${selectedLevel.color}20`, border: `1px solid ${selectedLevel.color}40`, color: selectedLevel.color }}>
            {selectedLevel.icon} {selectedLevel.name}
          </div>
        )}

        {/* Question overlay */}
        {activeQuestion && (
          <div className="absolute inset-0 flex items-center justify-center p-4"
            style={{ background: 'rgba(8,10,18,0.92)', borderRadius: 12 }}>
            <div className="w-full max-w-lg">
              <p className="text-xs uppercase tracking-widest mb-3 text-center" style={{ color: selectedLevel?.color ?? '#4D8BFF' }}>Question bonus</p>
              <p className="text-white font-semibold text-sm text-center mb-5 leading-relaxed">
                {activeQuestion.question_text}
              </p>
              <div className="space-y-2">
                {activeQuestion.answers.map(a => {
                  let bg = 'rgba(255,255,255,0.05)', border = 'rgba(255,255,255,0.1)', color = '#E5E7EB'
                  if (selectedAnswer) {
                    if (a.is_correct) { bg = 'rgba(37,194,146,0.15)'; border = '#25C292'; color = '#25C292' }
                    else if (a.id === selectedAnswer) { bg = 'rgba(255,77,106,0.15)'; border = '#FF4D6A'; color = '#FF4D6A' }
                  }
                  return (
                    <button key={a.id} onClick={() => handleAnswer(a.id)} disabled={!!selectedAnswer}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all disabled:cursor-not-allowed"
                      style={{ background: bg, border: `1px solid ${border}`, color }}>
                      {a.answer_text}
                    </button>
                  )
                })}
              </div>
              {answerResult && (
                <div className="mt-4 text-center">
                  <p className="text-sm mb-1" style={{ color: answerResult === 'correct' ? '#25C292' : '#FF4D6A' }}>
                    {answerResult === 'correct' ? `✓ Correct ! +${Math.round(50 * (stateRef.current?.scoreMult ?? 1))} pts` : '✗ Incorrect'}
                  </p>
                  {activeQuestion.explanation && (
                    <p className="text-gray-400 text-xs mt-1">{activeQuestion.explanation}</p>
                  )}
                  <button onClick={closeQuestion} className="mt-3 px-6 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
                    Continuer →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(8,10,18,0.95)', borderRadius: 12 }}>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">💀</div>
              <h2 className="font-cinzel text-2xl font-bold text-red-400 mb-4">Fin de partie</h2>
              <button onClick={() => selectedLevel && startLevel(selectedLevel)}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
                Recommencer →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 flex-wrap justify-center">
        <p className="text-gray-600 text-xs">← → pour bouger · Espace pour sauter · <span style={{ color: selectedLevel?.color ?? '#4D8BFF' }}>●</span> = question bonus</p>
        <button onClick={() => { cancelAnimationFrame(rafRef.current); setAppPhase('select') }}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← Niveaux
        </button>
      </div>

      {/* Touch controls */}
      <div className="flex gap-2 md:hidden flex-wrap justify-center">
        {[
          { label: '←',    down: () => touchLeft(true),  up: () => touchLeft(false), color: 'rgba(212,168,67,0.15)', border: 'rgba(212,168,67,0.3)' },
          { label: '⬆',   down: touchJump,               up: () => {},               color: 'rgba(77,139,255,0.15)', border: 'rgba(77,139,255,0.3)' },
          { label: '→',    down: () => touchRight(true), up: () => touchRight(false), color: 'rgba(212,168,67,0.15)', border: 'rgba(212,168,67,0.3)' },
          { label: '⚡',   down: touchDash,               up: () => {},               color: 'rgba(255,77,106,0.15)', border: 'rgba(255,77,106,0.4)' },
        ].map(btn => (
          <button key={btn.label}
            onTouchStart={e => { e.preventDefault(); btn.down() }}
            onTouchEnd={e => { e.preventDefault(); btn.up() }}
            onMouseDown={btn.down}
            onMouseUp={btn.up}
            className="w-14 h-14 rounded-xl text-white text-xl font-bold select-none"
            style={{ background: btn.color, border: `2px solid ${btn.border}` }}>
            {btn.label}
          </button>
        ))}
        <p className="w-full text-center text-gray-600 text-xs mt-1">⚡ = Dash (Shift/X)</p>
      </div>
      <p className="text-gray-600 text-xs text-center hidden md:block">
        Flèches/WASD = déplacer · Espace/W/↑ = sauter (×2) · Shift/X = dash ⚡
      </p>
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </div>
  )
}
