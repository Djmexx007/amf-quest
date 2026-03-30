'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import type { QuestionWithAnswers } from '@/types'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

// ── Game constants ──────────────────────────────────────────
const W = 800
const H = 450
const GRAVITY = 0.55
const JUMP_FORCE = -13
const MOVE_SPEED = 4.5
const PLATFORM_H = 14
const COIN_SIZE = 14
const PLAYER_W = 28
const PLAYER_H = 36
const QUESTION_EVERY = 3   // coins before question

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
  questionIndex: number
  qCount: number
}

function generateWorld(questions: QuestionWithAnswers[]): Pick<GameState, 'platforms' | 'coins'> {
  const platforms: Platform[] = [
    { x: 0,    y: H - 30, w: 300 },
    { x: 340,  y: H - 90, w: 180 },
    { x: 560,  y: H - 30, w: 200 },
    { x: 800,  y: H - 140, w: 160 },
    { x: 1010, y: H - 30, w: 220 },
    { x: 1270, y: H - 110, w: 150 },
    { x: 1460, y: H - 30, w: 200 },
    { x: 1700, y: H - 170, w: 180 },
    { x: 1930, y: H - 30, w: 300 },
    { x: 2270, y: H - 130, w: 160 },
    { x: 2480, y: H - 30, w: 300 },
  ]

  const coins: Coin[] = []
  let qIdx = 0
  platforms.forEach(p => {
    const count = Math.floor(p.w / 55)
    for (let i = 0; i < count; i++) {
      const hasQ = (coins.length + 1) % QUESTION_EVERY === 0 && qIdx < questions.length
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

// ── Component ───────────────────────────────────────────────
export default function PlatformerPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useUIStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const stateRef = useRef<GameState | null>(null)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)

  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [loadingQ, setLoadingQ] = useState(true)
  const [activeQuestion, setActiveQuestion] = useState<QuestionWithAnswers | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])

  // ── Load questions ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/game/questions?game=quiz&count=15')
      .then(r => r.json())
      .then(d => { if (d.questions) setQuestions(d.questions) })
      .catch(console.error)
      .finally(() => setLoadingQ(false))
  }, [])

  // ── Init game ───────────────────────────────────────────
  useEffect(() => {
    if (loadingQ) return
    const { platforms, coins } = generateWorld(questions)
    stateRef.current = {
      px: 60, py: H - 30 - PLAYER_H,
      pvx: 0, pvy: 0,
      onGround: false,
      scrollX: 0,
      coinsCollected: 0,
      score: 0,
      alive: true,
      platforms, coins,
      particles: [],
      questionIndex: 0,
      qCount: 0,
    }
  }, [loadingQ, questions])

  // ── Keyboard ────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ── Render ──────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#080A12'
    ctx.fillRect(0, 0, W, H)

    // Stars (static)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 50) % W)
      const sy = ((i * 97 + 30) % (H * 0.75))
      ctx.fillRect(sx, sy, 1, 1)
    }

    const ox = state.scrollX  // camera offset

    // Platforms
    state.platforms.forEach(p => {
      const sx = p.x - ox
      if (sx + p.w < 0 || sx > W) return
      const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + PLATFORM_H)
      grad.addColorStop(0, '#2A3A6A')
      grad.addColorStop(1, '#1A2550')
      ctx.fillStyle = grad
      ctx.fillRect(sx, p.y, p.w, PLATFORM_H)
      ctx.fillStyle = 'rgba(77,139,255,0.4)'
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
      ctx.fillStyle = c.hasQuestion ? '#4D8BFF' : '#D4A843'
      ctx.shadowColor = c.hasQuestion ? '#4D8BFF' : '#D4A843'
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

    // Player
    const psx = state.px - ox
    const bodyGrad = ctx.createLinearGradient(psx, state.py, psx + PLAYER_W, state.py + PLAYER_H)
    bodyGrad.addColorStop(0, '#D4A843')
    bodyGrad.addColorStop(1, '#B8892A')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.roundRect(psx, state.py, PLAYER_W, PLAYER_H, 5)
    ctx.fill()
    // Eyes
    ctx.fillStyle = '#080A12'
    ctx.beginPath(); ctx.arc(psx + 8, state.py + 12, 3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(psx + 20, state.py + 12, 3, 0, Math.PI * 2); ctx.fill()

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, W, 36)
    ctx.fillStyle = '#D4A843'
    ctx.font = 'bold 13px "Cinzel", serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${state.score}`, 16, 23)
    ctx.fillStyle = '#4D8BFF'
    ctx.textAlign = 'center'
    ctx.fillText(`Pièces: ${state.coinsCollected}`, W / 2, 23)
    ctx.fillStyle = '#25C292'
    ctx.textAlign = 'right'
    ctx.fillText(`Questions: ${state.qCount}`, W - 16, 23)
  }, [])

  // ── Game loop ───────────────────────────────────────────
  const loop = useCallback(() => {
    const state = stateRef.current
    if (!state || !state.alive || pausedRef.current) { rafRef.current = requestAnimationFrame(loop); return }

    const keys = keysRef.current

    // Horizontal movement
    if (keys.has('ArrowLeft') || keys.has('KeyA')) state.pvx = -MOVE_SPEED
    else if (keys.has('ArrowRight') || keys.has('KeyD')) state.pvx = MOVE_SPEED
    else state.pvx = 0

    // Jump
    if ((keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) && state.onGround) {
      state.pvy = JUMP_FORCE
      state.onGround = false
    }

    // Physics
    state.pvy += GRAVITY
    state.px += state.pvx
    state.py += state.pvy

    // Platform collision
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
        state.onGround = true
      }
    })

    // Fall off screen
    if (state.py > H + 60) {
      state.py = H - 30 - PLAYER_H
      state.px = Math.max(60, state.scrollX + 60)
      state.pvy = 0
    }

    // Screen bounds
    if (state.px < state.scrollX + 80) state.px = state.scrollX + 80
    const lastPlatform = state.platforms[state.platforms.length - 1]
    const worldEnd = lastPlatform.x + lastPlatform.w

    // Camera scroll
    const targetScroll = state.px - W * 0.4
    state.scrollX = Math.max(0, Math.min(targetScroll, worldEnd - W))

    // Coin collection
    state.coins.forEach(c => {
      if (c.collected) return
      if (
        state.px < c.x + COIN_SIZE &&
        state.px + PLAYER_W > c.x &&
        state.py < c.y + COIN_SIZE &&
        state.py + PLAYER_H > c.y
      ) {
        c.collected = true
        state.coinsCollected++
        state.score += 10
        for (let i = 0; i < 6; i++) {
          state.particles.push({
            x: c.x + COIN_SIZE / 2, y: c.y,
            vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1,
            life: 20, color: c.hasQuestion ? '#4D8BFF' : '#D4A843',
          })
        }
        if (c.hasQuestion && c.qIndex >= 0 && c.qIndex < questions.length) {
          pausedRef.current = true
          setActiveQuestion(questions[c.qIndex])
        }
      }
    })

    // Particles
    state.particles = state.particles.filter(p => p.life > 0)
    state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life-- })

    // Win condition
    if (state.px >= worldEnd - 40) {
      state.alive = false
      setGameWon(true)
      setFinalScore(state.score)
    }

    draw()
    rafRef.current = requestAnimationFrame(loop)
  }, [draw, questions])

  // Start loop once questions loaded
  useEffect(() => {
    if (loadingQ) return
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loadingQ, loop])

  // ── Answer handling ─────────────────────────────────────
  function handleAnswer(answerId: string) {
    if (!activeQuestion || answerResult) return
    setSelectedAnswer(answerId)
    const correct = activeQuestion.answers.find(a => a.is_correct)?.id === answerId
    setAnswerResult(correct ? 'correct' : 'wrong')
    if (stateRef.current) {
      stateRef.current.score += correct ? 50 : 0
      stateRef.current.qCount++
    }
  }

  function closeQuestion() {
    setActiveQuestion(null)
    setSelectedAnswer(null)
    setAnswerResult(null)
    pausedRef.current = false
  }

  // ── Submit score ────────────────────────────────────────
  const submitScore = useCallback(async (score: number, correct: number, total: number) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/game/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_type: 'platformer',
          score,
          questions_total: total,
          questions_correct: correct,
          best_streak: 0,
          avg_time_seconds: 0,
        }),
      })
      const data = await res.json()
      if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    } catch { /* noop */ }
    finally { setSubmitting(false) }
  }, [])

  useEffect(() => {
    if (gameWon && stateRef.current) {
      const s = stateRef.current
      submitScore(s.score, s.qCount, questions.length)
    }
  }, [gameWon, questions.length, submitScore])

  // ── Touch controls ──────────────────────────────────────
  function touchLeft(down: boolean) {
    if (down) keysRef.current.add('ArrowLeft'); else keysRef.current.delete('ArrowLeft')
  }
  function touchRight(down: boolean) {
    if (down) keysRef.current.add('ArrowRight'); else keysRef.current.delete('ArrowRight')
  }
  function touchJump() {
    keysRef.current.add('Space')
    setTimeout(() => keysRef.current.delete('Space'), 100)
  }

  if (loadingQ) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-float">🕹️</div>
          <p className="font-cinzel text-[#D4A843] text-sm animate-pulse tracking-widest">Chargement du niveau...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
      {/* Game canvas */}
      <div className="relative" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl border border-white/10 w-full"
          style={{ imageRendering: 'pixelated', maxHeight: '60vh', objectFit: 'contain' }}
        />

        {/* Question overlay */}
        {activeQuestion && (
          <div className="absolute inset-0 flex items-center justify-center p-4"
            style={{ background: 'rgba(8,10,18,0.92)', borderRadius: 12 }}>
            <div className="w-full max-w-lg">
              <p className="text-[#4D8BFF] text-xs uppercase tracking-widest mb-3 text-center">Question bonus</p>
              <p className="text-white font-semibold text-sm text-center mb-5 leading-relaxed">
                {activeQuestion.question_text}
              </p>
              <div className="space-y-2">
                {activeQuestion.answers.map(a => {
                  let bg = 'rgba(255,255,255,0.05)'
                  let border = 'rgba(255,255,255,0.1)'
                  let color = '#E5E7EB'
                  if (selectedAnswer) {
                    if (a.is_correct) { bg = 'rgba(37,194,146,0.15)'; border = '#25C292'; color = '#25C292' }
                    else if (a.id === selectedAnswer && !a.is_correct) { bg = 'rgba(255,77,106,0.15)'; border = '#FF4D6A'; color = '#FF4D6A' }
                  }
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleAnswer(a.id)}
                      disabled={!!selectedAnswer}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all disabled:cursor-not-allowed"
                      style={{ background: bg, border: `1px solid ${border}`, color }}
                    >
                      {a.answer_text}
                    </button>
                  )
                })}
              </div>
              {answerResult && (
                <div className="mt-4 text-center">
                  <p className="text-sm mb-1" style={{ color: answerResult === 'correct' ? '#25C292' : '#FF4D6A' }}>
                    {answerResult === 'correct' ? '✓ Correct ! +50 pts' : '✗ Incorrect'}
                  </p>
                  {activeQuestion.explanation && (
                    <p className="text-gray-400 text-xs mt-1">{activeQuestion.explanation}</p>
                  )}
                  <button
                    onClick={closeQuestion}
                    className="mt-3 px-6 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
                  >
                    Continuer →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Win screen */}
        {gameWon && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(8,10,18,0.92)', borderRadius: 12 }}>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🏆</div>
              <h2 className="font-cinzel text-2xl font-bold text-[#D4A843] mb-2">Niveau terminé !</h2>
              <p className="text-white text-lg mb-1">Score : <span className="font-bold text-[#D4A843]">{finalScore}</span></p>
              <p className="text-gray-400 text-sm mb-6">
                {stateRef.current?.coinsCollected} pièces · {stateRef.current?.qCount} questions
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/games')}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Retour aux jeux
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />

      {/* Controls hint + touch buttons */}
      <div className="flex items-center gap-6 flex-wrap justify-center">
        <p className="text-gray-600 text-xs">← → pour bouger · Espace pour sauter · 🔵 = question bonus</p>
      </div>
      {/* Touch controls */}
      <div className="flex gap-3 md:hidden">
        {[
          { label: '←', down: () => touchLeft(true), up: () => touchLeft(false) },
          { label: '↑', down: touchJump, up: () => {} },
          { label: '→', down: () => touchRight(true), up: () => touchRight(false) },
        ].map(btn => (
          <button
            key={btn.label}
            onTouchStart={e => { e.preventDefault(); btn.down() }}
            onTouchEnd={e => { e.preventDefault(); btn.up() }}
            onMouseDown={btn.down}
            onMouseUp={btn.up}
            className="w-14 h-14 rounded-xl text-white text-xl font-bold select-none"
            style={{ background: 'rgba(212,168,67,0.15)', border: '2px solid rgba(212,168,67,0.3)' }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
