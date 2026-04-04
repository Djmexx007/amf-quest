'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { QuestionWithAnswers } from '@/types'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

// ============================================================
// § TYPES
// ============================================================

type AppPhase = 'menu' | 'difficulty-select' | 'playing' | 'between-levels' | 'dead' | 'done'
type DiffKey   = 'easy' | 'normal' | 'hardcore'
type EnemyType = 'patrol' | 'fast' | 'tank' | 'shooter'

interface DiffConfig {
  key: DiffKey; label: string; icon: string; color: string
  maxHp: number; xpMult: number; coinsMult: number
  enemySpeedMult: number; iFrames: number; apiDiff: 1 | 2 | 3
}

interface Platform { x: number; y: number; w: number }

interface Coin {
  id: number; x: number; y: number
  collected: boolean; hasQuestion: boolean; qIndex: number
}

type EnemyBehavior = 'patrol' | 'idle-burst' | 'guard' | 'aggressive' | 'fake-idle'

interface Enemy {
  id: number; type: EnemyType
  behavior: EnemyBehavior
  x: number; y: number; vx: number; vy: number
  // Platform bounds — enemy never steps past these
  platL: number; platR: number; platY: number
  hp: number; maxHp: number; dir: 1 | -1
  dead: boolean; deathFrames: number
  // Movement / state
  speed: number           // base speed (personality)
  accel: number           // current velocity (smooth)
  pauseTimer: number      // idle micro-pause countdown
  alertTimer: number      // frames of "alert" state (chasing/dashing)
  activated: boolean      // for fake-idle / idle-burst
  // Shooter
  shootTimer: number; shootInterval: number
}

interface Projectile { id: number; x: number; y: number; vx: number }

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

interface Player {
  x: number; y: number; vx: number; vy: number
  onGround: boolean; facingRight: boolean
  jumpsLeft: number
  dashCooldown: number; isDashing: boolean; dashVx: number; dashFrames: number
  iFrames: number
}

// GS = mutable game state, lives entirely in a ref
interface GS {
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  platforms: Platform[]
  coins: Coin[]
  scrollX: number
  particles: Particle[]
  score: number
  coinsCollected: number
  correctCount: number
  questionsAnswered: number
  roundComplete: boolean
}

// ── Buff system ───────────────────────────────────────────────
interface BuffDef {
  id: string
  kind: 'persistent' | 'temporary'  // persistent = whole run | temporary = 1 round
  icon: string; name: string; desc: string
  maxStack: number
  // Stat deltas (applied per stack during computeStats)
  speedBonus?:      number   // additive
  jumpBonus?:       number   // additive, negative = stronger
  gravityBonus?:    number   // additive, negative = lighter
  scoreBonus?:      number   // additive to scoreMult
  shieldCharges?:   number   // absorb charges per stack
  hpBonus?:         number   // added to maxHp (handled immediately on pick)
  enemySlowFactor?: number   // multiplicative enemy speed factor, e.g. 0.55
  iFramesBonus?:    number   // iFrames given at round start
}

interface ActiveBuff { id: string; stacks: number }

interface BetweenChoice {
  kind: 'persistent' | 'temporary'
  buffId: string; icon: string; name: string; desc: string
}

interface SavedPerm { speed?: number; jump?: number; score?: number; gravity?: number }

// RS = mutable run state, lives entirely in a ref
interface RS {
  diff: DiffConfig
  round: number
  hp: number; maxHp: number
  totalScore: number; totalCoins: number
  totalCorrect: number; totalQuestions: number
  // Two buff tiers
  persistentBuffs: ActiveBuff[]   // survive all rounds until death/cashout
  temporaryBuffs:  ActiveBuff[]   // cleared at each round end
  // Derived stats — recomputed by computeStats() each round start
  moveSpeed: number; jumpForce: number; gravity: number; scoreMult: number
  shieldCharges: number; enemySlowMult: number; startIFrames: number
  // Base stats from cross-run localStorage upgrades — never mutated mid-run
  baseSpeed: number; baseJump: number; baseGravity: number; baseScoreMult: number
}

interface BetweenData {
  round: number; hp: number; maxHp: number
  roundScore: number; roundCoins: number
  roundCorrect: number; roundQuestions: number
  choices: BetweenChoice[]; isLastRound: boolean
}

interface DeadData  { round: number; score: number; coins: number }
interface RunReward { xp: number; coins: number; levelUp: boolean }
interface AchUnlock { slug: string; title: string; xp: number; coins: number }

// ============================================================
// § CONSTANTS
// ============================================================

const W = 800, H = 450
const COIN_SIZE = 14
const PW = 28, PH = 36         // Player W / H
const PLAT_H = 14
const EW = 30, EH = 34         // Enemy W / H
const PROJ_W = 10, PROJ_H = 6
const BASE_GRAV  = 0.52
const BASE_JUMP  = -13.0
const BASE_SPEED = 4.5
const BASE_SMULT = 1.0
const STOMP_BOUNCE = -10
const MAX_ROUNDS = 10

// ============================================================
// § DIFFICULTY
// ============================================================

const DIFFS: Record<DiffKey, DiffConfig> = {
  easy: {
    key: 'easy', label: 'Facile', icon: '🌿', color: '#25C292',
    maxHp: 5, xpMult: 0.5, coinsMult: 0.5,
    enemySpeedMult: 0.6, iFrames: 90, apiDiff: 1,
  },
  normal: {
    key: 'normal', label: 'Normal', icon: '⚖️', color: '#4D8BFF',
    maxHp: 3, xpMult: 1.0, coinsMult: 1.0,
    enemySpeedMult: 1.0, iFrames: 60, apiDiff: 2,
  },
  hardcore: {
    key: 'hardcore', label: 'Hardcore', icon: '🔥', color: '#FF4D6A',
    maxHp: 2, xpMult: 1.5, coinsMult: 1.5,
    enemySpeedMult: 1.4, iFrames: 40, apiDiff: 3,
  },
}

// ============================================================
// § BUFF DEFINITIONS
// ============================================================

const BUFF_DEFS: BuffDef[] = [
  // 🟢 Persistent — survive all rounds until death / cash out
  { id: 'p_hp',     kind: 'persistent', icon: '❤️',  name: '+1 Vie Max',      desc: '+1 HP max pour tout le run',         maxStack: 3, hpBonus: 1 },
  { id: 'p_speed',  kind: 'persistent', icon: '🏃',  name: 'Agilité',         desc: '+10% vitesse de déplacement',         maxStack: 5, speedBonus: 0.45 },
  { id: 'p_score',  kind: 'persistent', icon: '💎',  name: 'Collecteur',      desc: '+25% multiplicateur de score',        maxStack: 5, scoreBonus: 0.25 },
  { id: 'p_shield', kind: 'persistent', icon: '🛡️', name: 'Bouclier',        desc: '+1 charge : absorbe 1 dégât',         maxStack: 3, shieldCharges: 1 },
  { id: 'p_jump',   kind: 'persistent', icon: '🦘',  name: 'Saut Amélioré',  desc: '+10% force de saut',                  maxStack: 4, jumpBonus: -1.0 },
  // 🟡 Temporary — 1 round only, cleared at round end
  { id: 't_star',   kind: 'temporary',  icon: '⭐',  name: 'Invincible',      desc: 'Invincible au début du round (≈3s)', maxStack: 1, iFramesBonus: 220 },
  { id: 't_score2', kind: 'temporary',  icon: '✨',  name: 'Score ×2',        desc: 'Score doublé ce round',              maxStack: 1, scoreBonus: 1.0 },
  { id: 't_slow',   kind: 'temporary',  icon: '🐢',  name: 'Ralentissement',  desc: 'Ennemis à 55% de vitesse',           maxStack: 1, enemySlowFactor: 0.55 },
  { id: 't_jump',   kind: 'temporary',  icon: '🌪️', name: 'Super Saut',      desc: '+30% force de saut ce round',        maxStack: 1, jumpBonus: -3.9 },
]

// ── Cross-run perm (localStorage) — sets base stats at run start ──
function loadPerm(): SavedPerm {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('pf_perm') ?? '{}') } catch { return {} }
}
function savePerm(u: SavedPerm) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pf_perm', JSON.stringify(u))
}

// Aggregates persistentBuffs + temporaryBuffs into derived RS stats
function computeStats(rs: RS) {
  let speed    = rs.baseSpeed
  let jump     = rs.baseJump
  let gravity  = rs.baseGravity
  let score    = rs.baseScoreMult
  let shield   = 0
  let slow     = 1.0
  let iframes  = 0

  for (const ab of [...rs.persistentBuffs, ...rs.temporaryBuffs]) {
    const def = BUFF_DEFS.find(d => d.id === ab.id)
    if (!def) continue
    const n = ab.stacks
    if (def.speedBonus)      speed   += def.speedBonus      * n
    if (def.jumpBonus)       jump    += def.jumpBonus        * n
    if (def.gravityBonus)    gravity += def.gravityBonus     * n
    if (def.scoreBonus)      score   += def.scoreBonus       * n
    if (def.shieldCharges)   shield  += def.shieldCharges    * n
    if (def.enemySlowFactor) slow    *= Math.pow(def.enemySlowFactor, n)
    if (def.iFramesBonus)    iframes += def.iFramesBonus     * n
  }

  rs.moveSpeed     = Math.min(speed,   BASE_SPEED * 2.5)
  rs.jumpForce     = Math.max(jump,    -20)
  rs.gravity       = Math.max(gravity, 0.20)
  rs.scoreMult     = Math.min(score,   8)
  rs.shieldCharges = shield
  rs.enemySlowMult = slow
  rs.startIFrames  = iframes
}

// Returns 3 random between-round choices from both tiers
function pickBetweenChoices(rs: RS): BetweenChoice[] {
  const persistStacks: Record<string, number> = {}
  rs.persistentBuffs.forEach(b => { persistStacks[b.id] = b.stacks })

  const candidates: BetweenChoice[] = BUFF_DEFS
    .filter(def => {
      if (def.kind === 'persistent') {
        const cur = persistStacks[def.id] ?? 0
        return cur < def.maxStack
      }
      return true  // temp buffs always available
    })
    .map(def => ({ kind: def.kind, buffId: def.id, icon: def.icon, name: def.name, desc: def.desc }))

  return candidates.sort(() => Math.random() - 0.5).slice(0, 3)
}

// ============================================================
// § LEVEL GENERATOR
// ============================================================

let _uid = 0
function uid() { return ++_uid }

function genLevel(round: number, diff: DiffConfig, enemySlowMult = 1.0) {
  const platCount = 10 + Math.floor(round * 1.8)
  const platforms: Platform[] = [{ x: 0, y: H - 30, w: 280 }]

  let cursor = 340
  for (let i = 0; i < platCount; i++) {
    const prev = platforms[platforms.length - 1]
    const gap  = (70 + Math.random() * 90) * (1 + round * 0.04)
    const y    = Math.max(H * 0.22, Math.min(H - 60, prev.y + (Math.random() - 0.5) * (80 + round * 6)))
    const w    = Math.max(75, 200 - round * 4 + (Math.random() - 0.5) * 40)
    platforms.push({ x: Math.round(cursor), y: Math.round(y), w: Math.round(w) })
    cursor += w + gap
  }
  platforms.push({ x: cursor + 120, y: H - 30, w: 300 }) // flag platform

  // Coins
  const coins: Coin[] = []
  const maxQ = Math.min(6 + round * 2, 20)
  let qIdx = 0
  platforms.forEach(p => {
    const count = Math.floor(p.w / 55)
    for (let i = 0; i < count; i++) {
      const hasQ = (coins.length + 1) % 3 === 0 && qIdx < maxQ
      coins.push({ id: uid(), x: p.x + 30 + i * 55, y: p.y - 36, collected: false, hasQuestion: hasQ, qIndex: hasQ ? qIdx++ : -1 })
    }
  })

  const enemies = genEnemies(platforms, round, diff, enemySlowMult)
  return { platforms, coins, enemies, questionCount: qIdx }
}

// Behaviors available per type
const TYPE_BEHAVIORS: Record<EnemyType, EnemyBehavior[]> = {
  patrol:  ['patrol', 'aggressive', 'fake-idle'],
  fast:    ['idle-burst', 'aggressive', 'patrol'],
  tank:    ['patrol', 'guard'],
  shooter: ['guard', 'fake-idle'],
}

// Spawn-chance per difficulty (0–1)
const SPAWN_CHANCE: Record<DiffKey, number> = { easy: 0.40, normal: 0.60, hardcore: 0.75 }

function genEnemies(platforms: Platform[], round: number, diff: DiffConfig, enemySlowMult = 1.0): Enemy[] {
  const enemies: Enemy[] = []
  const baseSpd  = 1.4 * diff.enemySpeedMult * enemySlowMult
  const spawnPct = SPAWN_CHANCE[diff.key]

  // Types unlock by round
  const types: EnemyType[] = ['patrol']
  if (round >= 2) types.push('fast')
  if (round >= 3) types.push('tank')
  if (round >= 4) types.push('shooter')

  // Shot interval shrinks with round (more aggressive)
  const siBase = Math.max(95 - round * 5, 38)

  // Skip first (spawn) and last (flag) platform
  const eligible = platforms.slice(1, -1)

  eligible.forEach(p => {
    // Too narrow to host an enemy — skip
    if (p.w < 55) return

    // Roll spawn chance for this platform
    if (Math.random() > spawnPct) return

    // Late-game: small chance of 2 enemies on wide platforms
    const maxOnPlat = (round >= 6 && p.w >= 140) ? (Math.random() < 0.25 ? 2 : 1) : 1

    for (let slot = 0; slot < maxOnPlat; slot++) {
      const type    = types[Math.floor(Math.random() * types.length)]
      const isTank  = type === 'tank'
      const isShooter = type === 'shooter'

      // Personality seed: ±10% speed, ±15% reaction
      const speedMult = 0.9 + Math.random() * 0.2
      const reactionMult = 0.85 + Math.random() * 0.3
      const spd = baseSpd * speedMult

      // Safe bounds: enemy body must stay fully on platform
      const margin = EW + 6
      const safeW  = p.w - margin * 2
      if (safeW <= 0) continue

      // Spread two enemies if needed
      const spawnX = p.x + margin + (slot === 0 ? Math.random() * safeW * 0.5 : safeW * 0.5 + Math.random() * safeW * 0.5)

      // Pick behavior from this type's allowed list
      const bPool    = TYPE_BEHAVIORS[type]
      const behavior = bPool[Math.floor(Math.random() * bPool.length)]

      // Guard zone — centred on spawn position, ±40–70 px
      const guardR = 40 + Math.random() * 30

      enemies.push({
        id: uid(), type, behavior,
        x: spawnX, y: p.y - EH,
        vx: 0, vy: 0,
        platL: p.x + 4, platR: p.x + p.w - EW - 4, platY: p.y,
        hp: isTank ? 3 : 1, maxHp: isTank ? 3 : 1,
        dir: Math.random() > 0.5 ? 1 : -1,
        dead: false, deathFrames: 0,
        speed: isShooter ? 0 : spd,
        accel: 0,
        pauseTimer: Math.floor(Math.random() * 80),
        alertTimer: 0,
        activated: false,
        shootTimer: Math.floor(Math.random() * siBase * reactionMult),
        shootInterval: Math.floor(siBase * reactionMult),
        // store guard radius in patrolL/R for guard behavior
        ...(behavior === 'guard' ? { platL: Math.max(p.x + 4, spawnX - guardR), platR: Math.min(p.x + p.w - EW - 4, spawnX + guardR) } : {}),
      })
    }
  })

  return enemies
}

// ============================================================
// § STATE FACTORIES
// ============================================================

function makeRS(diffKey: DiffKey): RS {
  const diff = DIFFS[diffKey]
  const perm = loadPerm()
  const baseSpeed     = BASE_SPEED + (perm.speed   ?? 0)
  const baseJump      = BASE_JUMP  - (perm.jump    ?? 0)
  const baseGravity   = BASE_GRAV  - (perm.gravity ?? 0)
  const baseScoreMult = BASE_SMULT + (perm.score   ?? 0)
  const rs: RS = {
    diff, round: 1, hp: diff.maxHp, maxHp: diff.maxHp,
    totalScore: 0, totalCoins: 0, totalCorrect: 0, totalQuestions: 0,
    persistentBuffs: [], temporaryBuffs: [],
    moveSpeed: baseSpeed, jumpForce: baseJump, gravity: baseGravity, scoreMult: baseScoreMult,
    shieldCharges: 0, enemySlowMult: 1.0, startIFrames: 0,
    baseSpeed, baseJump, baseGravity, baseScoreMult,
  }
  return rs
}

function makeGS(platforms: Platform[], coins: Coin[], enemies: Enemy[], rs: RS): GS {
  return {
    player: {
      x: 60, y: H - 30 - PH, vx: 0, vy: 0,
      onGround: false, facingRight: true,
      jumpsLeft: 2, dashCooldown: 0, isDashing: false, dashVx: 0, dashFrames: 0,
      iFrames: rs.startIFrames,   // set by computeStats (e.g. t_star gives 220 frames)
    },
    enemies, projectiles: [], platforms, coins,
    scrollX: 0, particles: [],
    score: 0, coinsCollected: 0, correctCount: 0, questionsAnswered: 0,
    roundComplete: false,
  }
}

// ============================================================
// § DAMAGE HELPER  (pure — outside component, no React deps)
// ============================================================

function doHurt(gs: GS, rs: RS, onDeath: () => void) {
  const pl = gs.player
  if (pl.iFrames > 0) return

  // Shield charge absorbs the hit
  if (rs.shieldCharges > 0) {
    rs.shieldCharges--
    pl.iFrames = rs.diff.iFrames
    for (let i = 0; i < 16; i++) gs.particles.push({
      x: pl.x + PW / 2, y: pl.y + PH / 2,
      vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7,
      life: 28, maxLife: 28, color: '#4D8BFF', size: 5,
    })
    return
  }

  rs.hp = Math.max(0, rs.hp - 1)
  pl.iFrames = rs.diff.iFrames
  for (let i = 0; i < 12; i++) gs.particles.push({
    x: pl.x + PW / 2, y: pl.y + PH / 2,
    vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
    life: 22, maxLife: 22, color: '#FF4D6A', size: 4,
  })
  if (rs.hp <= 0) onDeath()
}

// ============================================================
// § MAIN COMPONENT
// ============================================================

export default function PlatformerPage() {

  // ── Refs (never trigger re-renders) ───────────────────────
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const keysRef    = useRef<Set<string>>(new Set())
  const gsRef      = useRef<GS | null>(null)
  const rsRef      = useRef<RS | null>(null)
  const rafRef     = useRef<number>(0)
  const pausedRef  = useRef(false)
  const jumpQ      = useRef(false)
  const dashQ      = useRef(false)
  const qsRef      = useRef<QuestionWithAnswers[]>([])
  const submitting = useRef(false)

  // ── React state (UI only) ─────────────────────────────────
  const [phase,        setPhase]        = useState<AppPhase>('menu')
  const [loading,      setLoading]      = useState(false)
  const [activeQ,      setActiveQ]      = useState<QuestionWithAnswers | null>(null)
  const [selAnswer,    setSelAnswer]    = useState<string | null>(null)
  const [ansResult,    setAnsResult]    = useState<'correct' | 'wrong' | null>(null)
  const [betweenData,  setBetweenData]  = useState<BetweenData | null>(null)
  const [deadData,     setDeadData]     = useState<DeadData | null>(null)
  const [reward,       setReward]       = useState<RunReward | null>(null)
  const [achievements, setAchievements] = useState<AchUnlock[]>([])
  const [savedPerm,    setSavedPerm]    = useState<SavedPerm>({})

  // ── Mount ──────────────────────────────────────────────────
  useEffect(() => {
    setSavedPerm(loadPerm())
  }, [])

  // ── Keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault()
      if (['Space','ArrowUp','KeyW'].includes(e.code))                               jumpQ.current = true
      if (['ShiftLeft','ShiftRight','KeyX'].includes(e.code))                        dashQ.current = true
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // ── draw  (useCallback with [] — only reads refs, always stable) ─
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const gs = gsRef.current
    const rs = rsRef.current
    if (!canvas || !gs || !rs) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { diff } = rs
    const ox = gs.scrollX
    const pl = gs.player

    // Background — hue shifts each round
    const hue = (rs.round * 37) % 360
    const bg  = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, `hsl(${hue},18%,5%)`)
    bg.addColorStop(1, `hsl(${(hue + 20) % 360},22%,9%)`)
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 60; i++) {
      const sz = i % 4 === 0 ? 2 : 1
      ctx.fillRect((i * 137 + rs.round * 11) % W, (i * 97 + 20) % (H * 0.75), sz, sz)
    }

    // Platforms
    gs.platforms.forEach(p => {
      const sx = p.x - ox
      if (sx + p.w < 0 || sx > W) return
      const pg = ctx.createLinearGradient(sx, p.y, sx, p.y + PLAT_H)
      pg.addColorStop(0, '#1d2e24'); pg.addColorStop(1, '#0d1c16')
      ctx.fillStyle = pg; ctx.fillRect(sx, p.y, p.w, PLAT_H)
      ctx.fillStyle = `${diff.color}70`; ctx.fillRect(sx, p.y, p.w, 2)
    })

    // Coins
    gs.coins.forEach(c => {
      if (c.collected) return
      const sx = c.x - ox
      if (sx < -20 || sx > W + 20) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(sx + COIN_SIZE / 2, c.y + COIN_SIZE / 2, COIN_SIZE / 2, 0, Math.PI * 2)
      ctx.fillStyle   = c.hasQuestion ? diff.color : '#D4A843'
      ctx.shadowColor = c.hasQuestion ? diff.color : '#D4A843'
      ctx.shadowBlur  = 8; ctx.fill(); ctx.restore()
      if (c.hasQuestion) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('?', sx + COIN_SIZE / 2, c.y + COIN_SIZE / 2 + 3)
      }
    })

    // Enemies
    const EC: Record<EnemyType, string> = { patrol:'#FF6B35', fast:'#FF2D55', tank:'#8B6030', shooter:'#9B59B6' }
    gs.enemies.forEach(e => {
      const sx = e.x - ox
      if (sx + EW < -30 || sx > W + 30) return
      if (e.dead) {
        ctx.globalAlpha = Math.max(0, e.deathFrames / 30)
        ctx.fillStyle = '#FF4D6A'; ctx.fillRect(sx, e.y, EW, EH)
        ctx.globalAlpha = 1; return
      }

      const isAlert = e.alertTimer > 0 || (e.behavior === 'aggressive' && Math.abs(e.accel) > e.speed * 0.7)
      const bodyColor = EC[e.type]

      // Alert glow
      if (isAlert) {
        ctx.save()
        ctx.shadowColor = '#FF2D55'; ctx.shadowBlur = 12
      }
      ctx.fillStyle = bodyColor
      ctx.beginPath(); ctx.roundRect(sx, e.y, EW, EH, 4); ctx.fill()
      if (isAlert) ctx.restore()

      // Fake-idle "sleeping" overlay when not activated
      if ((e.behavior === 'fake-idle' || e.behavior === 'idle-burst') && !e.activated) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath(); ctx.roundRect(sx, e.y, EW, EH, 4); ctx.fill()
        // Zzz
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('z', sx + EW / 2 + 2, e.y + 5)
      }

      // HP bar for tanks
      if (e.type === 'tank' && e.hp < e.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx, e.y - 8, EW, 4)
        ctx.fillStyle = '#25C292';           ctx.fillRect(sx, e.y - 8, EW * (e.hp / e.maxHp), 4)
      }

      // Eye — direction-aware + pupils dilate on alert
      const eyeX = sx + (e.dir > 0 ? EW - 8 : 8)
      const eyeR = isAlert ? 5 : 4
      ctx.fillStyle = isAlert ? '#FF4444' : '#fff'
      ctx.beginPath(); ctx.arc(eyeX, e.y + 11, eyeR, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(eyeX + (e.dir > 0 ? 1 : -1), e.y + 12, isAlert ? 3 : 2, 0, Math.PI * 2); ctx.fill()

      // Shooter antenna + charge indicator
      if (e.type === 'shooter') {
        const chargeRatio = e.shootTimer / e.shootInterval
        ctx.fillStyle = `rgba(155,89,182,${0.4 + chargeRatio * 0.6})`
        ctx.fillRect(sx + EW / 2 - 1, e.y - 8, 2, 8)
        ctx.fillStyle = `rgba(255,${Math.floor(80 + chargeRatio * 175)},50,${0.6 + chargeRatio * 0.4})`
        ctx.beginPath(); ctx.arc(sx + EW / 2, e.y - 10, 2 + chargeRatio * 2, 0, Math.PI * 2); ctx.fill()
      }

      // Guard: show guard-zone boundary as faint lines when player is near
      if (e.behavior === 'guard') {
        const lx = e.platL - ox, rx = e.platR + EW - ox
        ctx.strokeStyle = 'rgba(155,89,182,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4])
        ctx.beginPath(); ctx.moveTo(lx, e.platY); ctx.lineTo(lx, e.platY - 30); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(rx, e.platY); ctx.lineTo(rx, e.platY - 30); ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // Projectiles
    gs.projectiles.forEach(p => {
      const sx = p.x - ox
      ctx.save(); ctx.fillStyle = '#FF9F43'; ctx.shadowColor = '#FF9F43'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.ellipse(sx + PROJ_W/2, p.y + PROJ_H/2, PROJ_W/2, PROJ_H/2, 0, 0, Math.PI*2); ctx.fill()
      ctx.restore()
    })

    // Particles
    gs.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle   = p.color; ctx.fillRect(p.x - ox, p.y, p.size, p.size)
    })
    ctx.globalAlpha = 1

    // Finish flag
    const lastP = gs.platforms[gs.platforms.length - 1]
    const fx = lastP.x + lastP.w - 50 - ox
    if (fx > -60 && fx < W + 60) {
      ctx.fillStyle = '#D4A843'; ctx.fillRect(fx, lastP.y - 70, 3, 70)
      ctx.fillStyle = diff.color
      ctx.beginPath(); ctx.moveTo(fx+3, lastP.y-70); ctx.lineTo(fx+35, lastP.y-56); ctx.lineTo(fx+3, lastP.y-42); ctx.fill()
    }

    // Player
    const psx   = pl.x - ox
    const flash = pl.iFrames > 0 && Math.floor(pl.iFrames / 5) % 2 === 0
    if (!flash) {
      ctx.save()
      const bodyG = ctx.createLinearGradient(psx, pl.y, psx + PW, pl.y + PH)
      bodyG.addColorStop(0, '#D4A843'); bodyG.addColorStop(1, '#B8892A')
      ctx.fillStyle = bodyG
      ctx.beginPath(); ctx.roundRect(psx, pl.y, PW, PH, 5); ctx.fill()
      ctx.fillStyle = '#080A12'
      ctx.beginPath(); ctx.arc(psx + (pl.facingRight ? 18 : 10), pl.y + 13, 3, 0, Math.PI * 2); ctx.fill()
      // Shield ring — one ring per remaining charge
      if (rs.shieldCharges > 0) {
        for (let sc = 0; sc < rs.shieldCharges; sc++) {
          ctx.strokeStyle = '#4D8BFF'; ctx.lineWidth = 1.5
          ctx.shadowColor = '#4D8BFF'; ctx.shadowBlur = 8
          ctx.globalAlpha = 0.6 + sc * 0.15
          ctx.beginPath(); ctx.arc(psx + PW/2, pl.y + PH/2, PW + sc * 6, 0, Math.PI*2); ctx.stroke()
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
      }
      ctx.restore()
    }
    // Dash glow
    if (pl.isDashing) {
      ctx.save(); ctx.shadowColor = diff.color; ctx.shadowBlur = 20
      ctx.strokeStyle = diff.color; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(psx - 2, pl.y - 2, PW + 4, PH + 4, 6); ctx.stroke()
      ctx.restore()
    }

    // ── HUD ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0, 0, W, 42)

    // Hearts
    for (let i = 0; i < rs.maxHp; i++) {
      ctx.font = '15px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(i < rs.hp ? '❤️' : '🖤', 10 + i * 22, 27)
    }
    // Score
    ctx.fillStyle = '#D4A843'; ctx.font = 'bold 13px "Cinzel", serif'; ctx.textAlign = 'center'
    ctx.fillText(`Score: ${gs.score}`, W / 2, 27)
    // Round + coins
    ctx.fillStyle = diff.color; ctx.textAlign = 'right'
    ctx.fillText(`Rnd ${rs.round}/${MAX_ROUNDS} · 💰${gs.coinsCollected}`, W - 12, 27)

    // Jump dots
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = j < pl.jumpsLeft ? '#FFD700' : 'rgba(255,215,0,0.2)'
      ctx.beginPath(); ctx.arc(W - 88 + j * 14, 52, 5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText('2-SAUT', W - 12, 56)

    // Dash bar
    const dbW   = 68, dbY = 68
    const dbFil = pl.dashCooldown === 0 ? dbW : Math.max(0, dbW * (1 - pl.dashCooldown / 45))
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(W - 12 - dbW, dbY, dbW, 4)
    ctx.fillStyle = pl.dashCooldown === 0 ? diff.color : 'rgba(255,255,255,0.25)'
    ctx.fillRect(W - 12 - dbW, dbY, dbFil, 4)
    ctx.fillText('DASH', W - 12, dbY + 12)

    // ── Active buff icons ──────────────────────────────────
    // Persistent buffs — green, left column
    if (rs.persistentBuffs.length > 0) {
      ctx.font = '12px sans-serif'; ctx.textAlign = 'left'
      rs.persistentBuffs.forEach((ab, i) => {
        const def = BUFF_DEFS.find(d => d.id === ab.id)
        if (!def) return
        const y = 52 + i * 18
        ctx.fillText(def.icon, 8, y)
        if (ab.stacks > 1) {
          ctx.fillStyle = '#25C292'; ctx.font = 'bold 9px sans-serif'
          ctx.fillText(`×${ab.stacks}`, 24, y)
          ctx.font = '12px sans-serif'
        }
        ctx.fillStyle = '#25C292'
      })
    }
    // Temporary buffs — yellow, pulsing, below persists
    if (rs.temporaryBuffs.length > 0) {
      const pulse = 0.6 + Math.sin(Date.now() / 280) * 0.4
      ctx.globalAlpha = pulse
      ctx.font = '12px sans-serif'; ctx.textAlign = 'left'
      const yOff = 52 + rs.persistentBuffs.length * 18
      rs.temporaryBuffs.forEach((ab, i) => {
        const def = BUFF_DEFS.find(d => d.id === ab.id)
        if (!def) return
        const y = yOff + i * 18
        ctx.fillText(def.icon, 8, y)
        ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 8px sans-serif'
        ctx.fillText('1RND', 24, y)
        ctx.font = '12px sans-serif'
      })
      ctx.globalAlpha = 1
    }
  }, [])

  // ── loop  (useCallback with [draw] — stable since draw is stable) ─
  const loop = useCallback(() => {
    const gs = gsRef.current, rs = rsRef.current
    if (!gs || !rs) { rafRef.current = requestAnimationFrame(loop); return }

    if (pausedRef.current) {
      draw(); rafRef.current = requestAnimationFrame(loop); return
    }
    if (gs.roundComplete) { rafRef.current = requestAnimationFrame(loop); return }

    const keys = keysRef.current
    const pl   = gs.player
    const diff = rs.diff

    // Death callback — closes over stable refs + stable setters
    const onDeath = () => {
      cancelAnimationFrame(rafRef.current)
      setDeadData({ round: rs.round, score: rs.totalScore + gs.score, coins: rs.totalCoins + gs.coinsCollected })
      setPhase('dead')
    }

    // ── Dash ───────────────────────────────────────────────
    if (pl.dashCooldown > 0) pl.dashCooldown--
    if (dashQ.current && pl.dashCooldown === 0 && !pl.isDashing) {
      const dir     = (keys.has('ArrowLeft') || keys.has('KeyA')) ? -1 : 1
      pl.isDashing  = true; pl.dashVx = dir * rs.moveSpeed * 3.5
      pl.dashFrames = 10; pl.dashCooldown = 45; pl.vy = 0
      for (let i = 0; i < 8; i++) gs.particles.push({
        x: pl.x + PW/2, y: pl.y + PH/2,
        vx: -dir * (Math.random() * 3 + 1), vy: (Math.random() - 0.5) * 2,
        life: 14, maxLife: 14, color: diff.color, size: 4,
      })
    }
    dashQ.current = false

    if (pl.isDashing) {
      pl.vx = pl.dashVx; pl.dashFrames--
      if (pl.dashFrames <= 0) { pl.isDashing = false; pl.dashVx = 0 }
    } else {
      if      (keys.has('ArrowLeft')  || keys.has('KeyA')) { pl.vx = -rs.moveSpeed; pl.facingRight = false }
      else if (keys.has('ArrowRight') || keys.has('KeyD')) { pl.vx =  rs.moveSpeed; pl.facingRight = true  }
      else pl.vx = 0
    }

    // ── Double jump ────────────────────────────────────────
    if (jumpQ.current && pl.jumpsLeft > 0 && !pl.isDashing) {
      pl.vy      = pl.jumpsLeft === 2 ? rs.jumpForce : rs.jumpForce * 0.85
      pl.jumpsLeft--; pl.onGround = false
      if (pl.jumpsLeft === 0) for (let i = 0; i < 10; i++) gs.particles.push({
        x: pl.x + PW/2, y: pl.y + PH,
        vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3 + 1,
        life: 18, maxLife: 18, color: '#FFD700', size: 3,
      })
    }
    jumpQ.current = false

    // ── Physics ────────────────────────────────────────────
    if (!pl.isDashing) pl.vy += rs.gravity
    pl.x += pl.vx; pl.y += pl.vy

    // Platform collisions
    pl.onGround = false
    gs.platforms.forEach(p => {
      if (pl.x + PW > p.x && pl.x < p.x + p.w &&
          pl.y + PH > p.y && pl.y + PH < p.y + PLAT_H + 12 && pl.vy >= 0) {
        pl.y = p.y - PH; pl.vy = 0
        if (!pl.onGround) { pl.onGround = true; pl.jumpsLeft = 2; pl.isDashing = false }
      }
    })

    // Fall off world — respawn with HP penalty
    if (pl.y > H + 80) {
      doHurt(gs, rs, onDeath)
      pl.y = H - 30 - PH; pl.x = Math.max(80, gs.scrollX + 80)
      pl.vy = 0; pl.jumpsLeft = 2; pl.isDashing = false
    }
    if (pl.x < gs.scrollX + 40) pl.x = gs.scrollX + 40

    // Scroll
    const lastP   = gs.platforms[gs.platforms.length - 1]
    const worldEnd = lastP.x + lastP.w
    gs.scrollX    = Math.max(0, Math.min(pl.x - W * 0.4, worldEnd - W))

    // iFrames countdown
    if (pl.iFrames > 0) pl.iFrames--

    // ── Enemy update ───────────────────────────────────────
    const toRemove: number[] = []
    const plCX = pl.x + PW / 2

    gs.enemies.forEach(e => {
      if (e.dead) { if (--e.deathFrames <= 0) toRemove.push(e.id); return }

      // ── Countdown timers ──────────────────────────────────
      if (e.pauseTimer > 0) e.pauseTimer--
      if (e.alertTimer > 0) e.alertTimer--

      const eCX    = e.x + EW / 2
      const dx     = plCX - eCX
      const absDx  = Math.abs(dx)
      const onSamePlatY = Math.abs(pl.y + PH - e.platY) < 24  // player near same height

      // Detection range scales with round
      const detectRange = 160 + rs.round * 12

      // ── Shooter fires regardless of movement behavior ─────
      if (e.type === 'shooter') {
        if (absDx < detectRange + 60 && onSamePlatY) {
          if (++e.shootTimer >= e.shootInterval) {
            e.shootTimer = 0
            const pvx = dx > 0 ? 4.5 : -4.5
            gs.projectiles.push({ id: uid(), x: eCX, y: e.y + EH / 2, vx: pvx })
            for (let i = 0; i < 4; i++) gs.particles.push({
              x: eCX, y: e.y + EH / 2,
              vx: pvx * 0.4 + (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
              life: 12, maxLife: 12, color: '#FF9F43', size: 3,
            })
          }
        }
        // Shooters don't move horizontally — exit early
        return
      }

      // ── Determine target velocity per behavior ─────────────
      let targetVx = 0

      switch (e.behavior) {

        case 'patrol':
          if (e.pauseTimer > 0) { targetVx = 0; break }
          targetVx = e.speed * e.dir
          // Random micro-pause
          if (Math.random() < 0.003) { e.pauseTimer = 20 + Math.floor(Math.random() * 30) }
          break

        case 'aggressive':
          // Always moving; chases player if in range, otherwise patrols faster
          if (absDx < detectRange && onSamePlatY) {
            e.dir = dx > 0 ? 1 : -1
            targetVx = e.speed * e.dir * (e.type === 'fast' ? 1.7 : 1.2)
          } else {
            targetVx = e.speed * e.dir * 1.1
          }
          break

        case 'idle-burst':
          if (!e.activated) {
            // Dormant until player enters range
            if (absDx < detectRange && onSamePlatY) {
              e.activated = true
              e.alertTimer = 90 + rs.round * 5   // chase duration
            }
            targetVx = 0
          } else {
            if (e.alertTimer > 0) {
              // Dash toward player
              e.dir = dx > 0 ? 1 : -1
              targetVx = e.speed * e.dir * 2.2
            } else {
              // Cool-down: go dormant again briefly
              e.activated = false
              e.pauseTimer = 60
              targetVx = 0
            }
          }
          break

        case 'guard': {
          const guardMid = (e.platL + e.platR) / 2
          if (absDx < detectRange && onSamePlatY) {
            // Player in range — move toward player but stay in zone
            e.dir = dx > 0 ? 1 : -1
            targetVx = e.speed * e.dir
          } else {
            // Return slowly toward zone centre
            const toCentre = guardMid - eCX
            if (Math.abs(toCentre) > 8) {
              e.dir = toCentre > 0 ? 1 : -1
              targetVx = e.speed * e.dir * 0.5
            } else {
              targetVx = 0
            }
          }
          break
        }

        case 'fake-idle':
          if (!e.activated) {
            // Looks idle — slight sway
            if (e.pauseTimer === 0) {
              targetVx = e.speed * 0.15 * e.dir
              if (Math.random() < 0.02) { e.dir = (e.dir * -1) as 1|-1 }
            }
            if (absDx < detectRange * 0.65 && onSamePlatY) {
              e.activated = true
              e.alertTimer = 120
            }
          } else {
            if (e.alertTimer > 0) {
              e.dir = dx > 0 ? 1 : -1
              targetVx = e.speed * e.dir * 1.8
            } else {
              e.activated = false
            }
          }
          break
      }

      // ── Smooth acceleration (no instant speed changes) ─────
      const accelRate = e.type === 'tank' ? 0.08 : 0.18
      e.accel += (targetVx - e.accel) * accelRate
      if (Math.abs(e.accel) < 0.05) e.accel = 0

      // ── Platform edge clamping (CRITICAL) ─────────────────
      // Check if next position would go past safe bounds
      const nextX = e.x + e.accel
      if (nextX <= e.platL) {
        e.x = e.platL
        e.accel = 0
        e.dir = 1
        e.activated = false   // reset burst states on wall bounce
      } else if (nextX + EW >= e.platR + EW) {
        // platR already accounts for EW offset
        e.x = e.platR
        e.accel = 0
        e.dir = -1
        e.activated = false
      } else {
        e.x = nextX
      }

      // Keep enemy locked to platform Y (no falling)
      e.y = e.platY - EH
    })
    gs.enemies = gs.enemies.filter(e => !toRemove.includes(e.id))

    // ── Enemy collision ─────────────────────────────────────
    if (pl.iFrames === 0) {
      gs.enemies.forEach(e => {
        if (e.dead) return
        const stomping =
          pl.vy > 0 &&
          pl.y + PH > e.y && pl.y + PH < e.y + EH * 0.55 &&
          pl.x + PW > e.x && pl.x < e.x + EW
        if (stomping) {
          if (--e.hp <= 0) { e.dead = true; e.deathFrames = 30; gs.score += Math.round(50 * rs.scoreMult) }
          for (let i = 0; i < 10; i++) gs.particles.push({
            x: e.x + EW/2, y: e.y,
            vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5,
            life: 20, maxLife: 20, color: '#FF4D6A', size: 4,
          })
          pl.vy = STOMP_BOUNCE; pl.jumpsLeft = 2
        } else {
          const overlap =
            pl.x + PW > e.x + 4 && pl.x < e.x + EW - 4 &&
            pl.y + PH > e.y + 4 && pl.y < e.y + EH - 4
          if (overlap) doHurt(gs, rs, onDeath)
        }
      })
    }

    // ── Projectile update ───────────────────────────────────
    gs.projectiles = gs.projectiles.filter(proj => {
      proj.x += proj.vx
      if (proj.x < gs.scrollX - 120 || proj.x > gs.scrollX + W + 120) return false
      if (pl.iFrames === 0 &&
          pl.x < proj.x + PROJ_W && pl.x + PW > proj.x &&
          pl.y < proj.y + PROJ_H && pl.y + PH  > proj.y) {
        doHurt(gs, rs, onDeath)
        for (let i = 0; i < 8; i++) gs.particles.push({
          x: proj.x, y: proj.y,
          vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
          life: 15, maxLife: 15, color: '#FF9F43', size: 3,
        })
        return false
      }
      return true
    })

    // ── Coin collection ─────────────────────────────────────
    gs.coins.forEach(c => {
      if (c.collected) return
      if (pl.x < c.x + COIN_SIZE && pl.x + PW > c.x && pl.y < c.y + COIN_SIZE && pl.y + PH > c.y) {
        c.collected = true; gs.coinsCollected++
        gs.score += Math.round(10 * rs.scoreMult)
        for (let i = 0; i < 6; i++) gs.particles.push({
          x: c.x + COIN_SIZE/2, y: c.y,
          vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1,
          life: 20, maxLife: 20, color: c.hasQuestion ? diff.color : '#D4A843', size: 4,
        })
        if (c.hasQuestion && c.qIndex >= 0 && c.qIndex < qsRef.current.length) {
          pausedRef.current = true
          setActiveQ(qsRef.current[c.qIndex])
        }
      }
    })

    // ── Particle lifecycle ──────────────────────────────────
    gs.particles = gs.particles.filter(p => p.life > 0)
    gs.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life-- })

    // ── Win condition ───────────────────────────────────────
    if (pl.x >= worldEnd - 80 && !gs.roundComplete) {
      gs.roundComplete = true
      cancelAnimationFrame(rafRef.current)

      // Accumulate this round into run totals
      rs.totalScore    += gs.score
      rs.totalCoins    += gs.coinsCollected
      rs.totalCorrect  += gs.correctCount
      rs.totalQuestions += gs.questionsAnswered

      setBetweenData({
        round: rs.round, hp: rs.hp, maxHp: rs.maxHp,
        roundScore: gs.score, roundCoins: gs.coinsCollected,
        roundCorrect: gs.correctCount, roundQuestions: gs.questionsAnswered,
        choices: pickBetweenChoices(rs),
        isLastRound: rs.round >= MAX_ROUNDS,
      })
      setPhase('between-levels')
      return
    }

    draw()
    rafRef.current = requestAnimationFrame(loop)
  }, [draw])

  // ── Start / stop loop ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || loading) return
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, loading, loop])

  // ── startRun ───────────────────────────────────────────────
  async function startRun(diffKey: DiffKey) {
    setReward(null)
    const run = makeRS(diffKey)
    rsRef.current = run
    await startRound(run)
  }

  async function startRound(rs: RS) {
    setLoading(true)
    setActiveQ(null); setSelAnswer(null); setAnsResult(null)
    pausedRef.current = false; jumpQ.current = false; dashQ.current = false

    const qDiff = rs.round <= 2 ? 1 : rs.round <= 5 ? 2 : 3
    const level = genLevel(rs.round, rs.diff, rs.enemySlowMult)
    const data  = await fetch(`/api/game/questions?game=quiz&count=${level.questionCount}&difficulty=${qDiff}`)
      .then(r => r.json()).catch(() => ({ questions: [] }))
    qsRef.current = data.questions ?? []

    gsRef.current = makeGS(level.platforms, level.coins, level.enemies, rs)
    rsRef.current = rs
    setLoading(false)
    setPhase('playing')
  }

  // ── Answer handling ────────────────────────────────────────
  function handleAnswer(answerId: string) {
    if (!activeQ || ansResult) return
    const correct = activeQ.answers.find(a => a.is_correct)?.id === answerId
    setSelAnswer(answerId)
    setAnsResult(correct ? 'correct' : 'wrong')

    const gs = gsRef.current, rs = rsRef.current
    if (gs && rs) {
      gs.questionsAnswered++
      if (correct) {
        gs.score += Math.round(50 * rs.scoreMult)
        gs.correctCount++
        for (let i = 0; i < 8; i++) gs.particles.push({
          x: gs.player.x + PW/2 + (Math.random() - 0.5) * 30, y: gs.player.y - 10,
          vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 2,
          life: 25, maxLife: 25, color: '#25C292', size: 5,
        })
      } else {
        // Wrong answer — apply damage (handled as side-effect on ref, death checked in closeQuestion)
        rs.hp = Math.max(0, rs.hp - 1)
        gs.player.iFrames = rs.diff.iFrames
      }
    }
  }

  function closeQuestion() {
    setActiveQ(null); setSelAnswer(null); setAnsResult(null)
    const rs = rsRef.current
    // Check death from wrong answer
    if (rs && rs.hp <= 0) {
      pausedRef.current = false
      cancelAnimationFrame(rafRef.current)
      const gs = gsRef.current
      setDeadData({ round: rs.round, score: rs.totalScore + (gs?.score ?? 0), coins: rs.totalCoins + (gs?.coinsCollected ?? 0) })
      setPhase('dead')
      return
    }
    pausedRef.current = false
  }

  // ── Between-levels: continue with chosen buff ─────────────
  function handleContinue(choice: BetweenChoice | null) {
    const rs = rsRef.current
    if (!rs) return

    // Clear temporary buffs from the round that just ended
    rs.temporaryBuffs = []

    if (choice) {
      const def = BUFF_DEFS.find(d => d.id === choice.buffId)
      if (choice.kind === 'persistent') {
        const existing = rs.persistentBuffs.find(b => b.id === choice.buffId)
        if (existing) existing.stacks++
        else rs.persistentBuffs.push({ id: choice.buffId, stacks: 1 })
        // HP buff applied immediately to current run HP
        if (def?.hpBonus) { rs.maxHp += def.hpBonus; rs.hp += def.hpBonus }
      } else {
        // Temporary buff: always exactly 1 stack for the next round
        rs.temporaryBuffs = [{ id: choice.buffId, stacks: 1 }]
      }
    }

    // Re-derive all stats from the updated buff arrays
    computeStats(rs)
    rs.round++
    startRound(rs)
  }

  // ── Cash out: submit score, keep accumulated stats ─────────
  async function handleCashOut() {
    if (submitting.current) return
    submitting.current = true
    cancelAnimationFrame(rafRef.current)
    setLoading(true)

    const rs = rsRef.current!

    const result = await fetch('/api/game/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'platformer',
        score: rs.totalScore,
        questions_total: rs.totalQuestions,
        questions_correct: rs.totalCorrect,
        best_streak: 0,
        avg_time_seconds: 0,
        difficulty: rs.diff.apiDiff,
        metadata: { rounds_completed: rs.round, difficulty: rs.diff.key, persistent_buffs: rs.persistentBuffs.map(b => b.id) },
      }),
    }).then(r => r.json()).catch(() => null)

    if (result?.achievements_unlocked?.length > 0) setAchievements(result.achievements_unlocked)
    if (result?.xp_earned) setReward({ xp: result.xp_earned, coins: result.coins_earned ?? 0, levelUp: result.level_up ?? false })

    setSavedPerm(loadPerm())
    setLoading(false)
    submitting.current = false
    setPhase('done')
  }

  // ── Touch helpers ──────────────────────────────────────────
  const tL = (d: boolean) => d ? keysRef.current.add('ArrowLeft')  : keysRef.current.delete('ArrowLeft')
  const tR = (d: boolean) => d ? keysRef.current.add('ArrowRight') : keysRef.current.delete('ArrowRight')

  // ============================================================
  // RENDER
  // ============================================================

  const rs = rsRef.current

  // ── Loading spinner ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">🕹️</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">
            {phase === 'playing' ? `Génération du Round ${rs?.round ?? ''}…` : 'Envoi des résultats…'}
          </p>
        </div>
      </div>
    )
  }

  // ── Menu ───────────────────────────────────────────────────
  if (phase === 'menu') {
    const p = savedPerm
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-8 text-center">
        <div>
          <div className="text-6xl mb-4 animate-float">🕹️</div>
          <h1 className="font-cinzel text-3xl font-bold text-white mb-2">Platformer Roguelike</h1>
          <p className="text-gray-400 text-sm">Survive. Réponds. Cash out ou péris.</p>
        </div>

        {(p.speed || p.jump || p.score || p.gravity) && (
          <div className="rpg-card p-3 flex gap-3 text-xs text-gray-400 flex-wrap justify-center">
            <span className="text-gray-300 font-semibold">Améliorations permanentes :</span>
            {p.speed   ? <span>⚡ +{((p.speed)   * 10).toFixed(0)}% vitesse</span> : null}
            {p.jump    ? <span>🦘 +{p.jump} saut</span>                             : null}
            {p.score   ? <span>💎 ×{(1 + (p.score ?? 0)).toFixed(1)} score</span>   : null}
            {p.gravity ? <span>🌙 gravité réduite</span>                             : null}
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setPhase('difficulty-select')}
            className="px-10 py-3 rounded-xl font-cinzel font-bold text-base hover:scale-[1.02] transition-transform"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
          >
            Commencer une Run →
          </button>
          <button onClick={() => { savePerm({}); setSavedPerm({}) }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Réinitialiser les perma
          </button>
        </div>

        <div className="rpg-card p-4 max-w-sm">
          <p className="text-gray-400 text-xs leading-relaxed">
            Réponds aux questions AMF tout en survivant aux ennemis.{' '}
            <span className="text-[#FF4D6A]">Mourir = tout perdre.</span>{' '}
            <span className="text-[#25C292]">Cash out = garder tes gains.</span>
          </p>
        </div>
      </div>
    )
  }

  // ── Difficulty select ──────────────────────────────────────
  if (phase === 'difficulty-select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-6">
        <div className="text-center">
          <h2 className="font-cinzel text-2xl font-bold text-white mb-1">Choisis ta difficulté</h2>
          <p className="text-gray-500 text-sm">Détermine HP, vitesse ennemis et multiplicateurs</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {(['easy','normal','hardcore'] as DiffKey[]).map(k => {
            const d = DIFFS[k]
            return (
              <button key={k} onClick={() => startRun(k)}
                className="rpg-card p-6 text-left hover:scale-[1.02] transition-transform"
                style={{ border: `1px solid ${d.color}40`, boxShadow: `0 0 20px ${d.color}10` }}>
                <div className="text-4xl mb-3">{d.icon}</div>
                <p className="font-cinzel font-bold text-white text-lg mb-2">{d.label}</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>❤️ {d.maxHp} HP de départ</p>
                  <p>👾 Vitesse ennemis ×{d.enemySpeedMult}</p>
                  <p>✨ XP ×{d.xpMult} · 💰 ×{d.coinsMult}</p>
                  <p>🛡️ {d.iFrames} i-frames après dégât</p>
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={() => setPhase('menu')} className="text-xs text-gray-600 hover:text-gray-400">← Retour</button>
      </div>
    )
  }

  // ── Between levels ─────────────────────────────────────────
  if (phase === 'between-levels' && betweenData) {
    const bd = betweenData
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-5">
        <div className="text-center animate-slide-up">
          <div className="text-5xl mb-2">🏕️</div>
          <h2 className="font-cinzel text-2xl font-bold text-[#D4A843]">Round {bd.round} terminé !</h2>
          <p className="text-gray-400 text-sm mt-1">
            {bd.isLastRound ? '🏁 Dernière étape !' : `${MAX_ROUNDS - bd.round} round(s) restant(s)`}
          </p>
        </div>

        {/* HP hearts */}
        <div className="flex gap-1 text-xl">
          {Array.from({ length: bd.maxHp }, (_, i) => (
            <span key={i} style={{ opacity: i < bd.hp ? 1 : 0.2 }}>❤️</span>
          ))}
        </div>

        {/* Round stats */}
        <div className="rpg-card p-4 flex gap-6 text-center">
          <div><p className="text-[#D4A843] font-bold text-lg">{bd.roundScore}</p>  <p className="text-gray-500 text-xs">Score</p></div>
          <div><p className="text-[#25C292] font-bold text-lg">{bd.roundCoins}</p>  <p className="text-gray-500 text-xs">Pièces</p></div>
          <div><p className="text-white font-bold text-lg">{bd.roundCorrect}/{bd.roundQuestions}</p><p className="text-gray-500 text-xs">Questions</p></div>
        </div>

        {/* Buff choices — hidden on last round */}
        {!bd.isLastRound && (
          <div className="w-full max-w-2xl">
            <p className="text-center text-xs text-gray-500 mb-3 uppercase tracking-widest">Choisis un buff</p>
            <div className="grid grid-cols-3 gap-3">
              {bd.choices.map(c => {
                const isPersistent = c.kind === 'persistent'
                return (
                  <button key={c.buffId} onClick={() => handleContinue(c)}
                    className="rpg-card p-4 text-center hover:scale-[1.03] transition-transform cursor-pointer flex flex-col items-center gap-1"
                    style={{
                      border:     `1px solid ${isPersistent ? 'rgba(37,194,146,0.45)' : 'rgba(245,158,11,0.45)'}`,
                      boxShadow:  `0 0 14px ${isPersistent ? 'rgba(37,194,146,0.08)' : 'rgba(245,158,11,0.08)'}`,
                    }}>
                    <div className="text-3xl mb-1">{c.icon}</div>
                    <p className="font-cinzel font-bold text-white text-sm">{c.name}</p>
                    <p className="text-gray-400 text-xs">{c.desc}</p>
                    <span className="mt-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: isPersistent ? 'rgba(37,194,146,0.15)'  : 'rgba(245,158,11,0.15)',
                        color:      isPersistent ? '#25C292'                 : '#F59E0B',
                        border:     `1px solid ${isPersistent ? 'rgba(37,194,146,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}>
                      {isPersistent ? '🟢 Tout le run' : '🟡 1 round'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!bd.isLastRound && (
            <button onClick={() => handleContinue(null)}
              className="px-5 py-2.5 rounded-lg text-sm text-gray-300 border border-white/10 hover:bg-white/5 transition-colors">
              Continuer sans buff
            </button>
          )}
          <button onClick={handleCashOut}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #25C292, #1A9E72)', color: '#080A12' }}>
            💰 Cash Out
          </button>
        </div>
      </div>
    )
  }

  // ── Death screen ───────────────────────────────────────────
  if (phase === 'dead') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-5 text-center">
        <div className="text-6xl mb-1">💀</div>
        <h2 className="font-cinzel text-2xl font-bold text-[#FF4D6A]">Tu es mort !</h2>
        <p className="text-gray-400 text-sm">Tous tes gains de cette run sont perdus.</p>
        {deadData && (
          <div className="rpg-card p-4 space-y-1 text-sm">
            <p className="text-gray-400">Round atteint : <span className="text-white font-bold">{deadData.round}</span></p>
            <p className="text-gray-400">Score : <span className="text-[#D4A843] font-bold">{deadData.score}</span></p>
            <p className="text-gray-400">Pièces : <span className="text-amber-400 font-bold">{deadData.coins} 💰</span></p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setPhase('menu')}
            className="px-5 py-2.5 rounded-lg text-sm text-gray-300 border border-white/10 hover:bg-white/5 transition-colors">
            Menu
          </button>
          <button onClick={() => setPhase('difficulty-select')}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
            Nouvelle Run →
          </button>
        </div>
      </div>
    )
  }


  // ── Done screen ────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 gap-5 text-center">
        <div className="text-5xl mb-1">🏆</div>
        <h2 className="font-cinzel text-2xl font-bold text-[#D4A843]">Run encaissée !</h2>
        {rs && (
          <p className="text-gray-400 text-sm">
            Round {rs.round} · Score total : <span className="text-white font-bold">{rs.totalScore}</span>
          </p>
        )}
        {reward && (
          <div className="flex gap-4 text-sm">
            <span className="text-[#D4A843] font-bold">+{reward.xp} XP</span>
            <span className="text-gray-500">·</span>
            <span className="text-amber-400 font-bold">+{reward.coins} 💰</span>
            {reward.levelUp && <span className="text-green-400 font-bold animate-pulse">⬆️ Niveau !</span>}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setPhase('menu')}
            className="px-5 py-2.5 rounded-lg text-sm text-gray-300 border border-white/10 hover:bg-white/5 transition-colors">
            Menu
          </button>
          <button onClick={() => setPhase('difficulty-select')}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}>
            Nouvelle Run →
          </button>
        </div>
        <AchievementUnlockToast achievements={achievements} onDone={() => setAchievements([])} />
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
      <div className="relative w-full" style={{ maxWidth: 'min(1400px, calc(100vw - 2rem))' }}>
        <canvas
          ref={canvasRef} width={W} height={H}
          className="rounded-xl border border-white/10 w-full"
          style={{ imageRendering: 'pixelated', maxHeight: 'calc(100vh - 180px)', objectFit: 'contain' }}
        />

        {/* Round badge */}
        {rs && (
          <div className="absolute top-10 left-2 px-2 py-1 rounded text-xs font-cinzel font-bold"
            style={{ background: `${rs.diff.color}20`, border: `1px solid ${rs.diff.color}40`, color: rs.diff.color }}>
            {rs.diff.icon} Round {rs.round}
          </div>
        )}

        {/* Question overlay */}
        {activeQ && (
          <div className="absolute inset-0 flex items-center justify-center p-4"
            style={{ background: 'rgba(8,10,18,0.93)', borderRadius: 12 }}>
            <div className="w-full max-w-lg">
              <p className="text-xs uppercase tracking-widest mb-3 text-center"
                style={{ color: rs?.diff.color ?? '#4D8BFF' }}>
                Question AMF
              </p>
              <p className="text-white font-semibold text-sm text-center mb-5 leading-relaxed">
                {activeQ.question_text}
              </p>
              <div className="space-y-2">
                {activeQ.answers.map(a => {
                  let bg = 'rgba(255,255,255,0.05)', border = 'rgba(255,255,255,0.1)', color = '#E5E7EB'
                  if (selAnswer) {
                    if (a.is_correct)          { bg = 'rgba(37,194,146,0.15)';  border = '#25C292'; color = '#25C292' }
                    else if (a.id === selAnswer){ bg = 'rgba(255,77,106,0.15)';  border = '#FF4D6A'; color = '#FF4D6A' }
                  }
                  return (
                    <button key={a.id} onClick={() => handleAnswer(a.id)} disabled={!!selAnswer}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm disabled:cursor-not-allowed transition-all"
                      style={{ background: bg, border: `1px solid ${border}`, color }}>
                      {a.answer_text}
                    </button>
                  )
                })}
              </div>
              {ansResult && (
                <div className="mt-4 text-center">
                  <p className="text-sm mb-1" style={{ color: ansResult === 'correct' ? '#25C292' : '#FF4D6A' }}>
                    {ansResult === 'correct'
                      ? `✓ Correct ! +${Math.round(50 * (rsRef.current?.scoreMult ?? 1))} pts`
                      : '✗ Incorrect — −1 HP !'}
                  </p>
                  {activeQ.explanation && (
                    <p className="text-gray-400 text-xs mt-1">{activeQ.explanation}</p>
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
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-5 flex-wrap justify-center text-xs text-gray-600">
        <span>
          ← → bouger · Espace sauter ×2 · Shift/X dash ·{' '}
          <span style={{ color: rs?.diff.color ?? '#4D8BFF' }}>●</span> = question
        </span>
      </div>

      {/* Touch controls */}
      <div className="flex gap-2 md:hidden flex-wrap justify-center">
        {[
          { label: '←',  dn: () => tL(true),              up: () => tL(false),            c: 'rgba(212,168,67,0.15)', b: 'rgba(212,168,67,0.3)' },
          { label: '⬆',  dn: () => { jumpQ.current=true }, up: () => {},                   c: 'rgba(77,139,255,0.15)', b: 'rgba(77,139,255,0.3)' },
          { label: '→',  dn: () => tR(true),              up: () => tR(false),            c: 'rgba(212,168,67,0.15)', b: 'rgba(212,168,67,0.3)' },
          { label: '⚡', dn: () => { dashQ.current=true }, up: () => {},                   c: 'rgba(255,77,106,0.15)', b: 'rgba(255,77,106,0.4)' },
        ].map(btn => (
          <button key={btn.label}
            onTouchStart={e => { e.preventDefault(); btn.dn() }}
            onTouchEnd={e => { e.preventDefault(); btn.up() }}
            onMouseDown={btn.dn} onMouseUp={btn.up}
            className="w-14 h-14 rounded-xl text-white text-xl font-bold select-none"
            style={{ background: btn.c, border: `2px solid ${btn.b}` }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
