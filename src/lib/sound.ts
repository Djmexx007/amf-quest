// Web Audio API sound system — no external dependencies
// All sounds generated procedurally (no audio files needed)

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return ctx
  } catch {
    return null
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
  delay = 0,
) {
  const c = getCtx()
  if (!c) return
  try {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime + delay)
    gain.gain.setValueAtTime(0, c.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration)
    osc.start(c.currentTime + delay)
    osc.stop(c.currentTime + delay + duration + 0.05)
  } catch { /* ignore AudioContext errors */ }
}

// Pitch-sliding tone (for trombone / airhorn effects)
function slideTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = 'sawtooth',
  volume = 0.12,
  delay = 0,
) {
  const c = getCtx()
  if (!c) return
  try {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, c.currentTime + delay)
    osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + delay + duration)
    gain.gain.setValueAtTime(0, c.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration)
    osc.start(c.currentTime + delay)
    osc.stop(c.currentTime + delay + duration + 0.05)
  } catch { /* ignore AudioContext errors */ }
}

export type SoundType =
  | 'buy' | 'equip' | 'hoverRare' | 'openChest' | 'legendaryDrop' | 'error'
  | 'airhorn' | 'sadTrombone' | 'rimshot' | 'cashRegister' | 'laser' | 'fart' | 'ding' | 'powerUp'
  | 'siren' | 'gong' | 'thunder' | 'bassDrop' | 'epicReveal'

export function playSound(type: SoundType) {
  switch (type) {
    case 'buy':
      // Satisfying ascending chime
      tone(523, 0.08, 'square', 0.09)
      tone(659, 0.08, 'square', 0.09, 0.10)
      tone(784, 0.18, 'square', 0.09, 0.20)
      break

    case 'equip':
      // Short confirmation ping
      tone(440, 0.06, 'sine', 0.11)
      tone(554, 0.12, 'sine', 0.11, 0.08)
      break

    case 'hoverRare':
      // Subtle high tick
      tone(1200, 0.04, 'sine', 0.04)
      break

    case 'openChest':
      // Drumroll buildup + burst
      tone(110, 0.08, 'sawtooth', 0.06)
      tone(220, 0.08, 'sawtooth', 0.06, 0.09)
      tone(330, 0.08, 'sawtooth', 0.07, 0.18)
      tone(440, 0.08, 'sine', 0.09, 0.27)
      tone(660, 0.25, 'sine', 0.12, 0.36)
      break

    case 'legendaryDrop':
      // Dramatic fanfare
      tone(440,  0.08, 'sine', 0.10)
      tone(554,  0.08, 'sine', 0.10, 0.10)
      tone(659,  0.08, 'sine', 0.10, 0.20)
      tone(880,  0.08, 'sine', 0.12, 0.30)
      tone(1109, 0.55, 'sine', 0.14, 0.40)
      tone(1319, 0.35, 'sine', 0.08, 0.55)
      break

    case 'error':
      tone(220, 0.12, 'sawtooth', 0.09)
      tone(180, 0.18, 'sawtooth', 0.07, 0.14)
      break

    // ── Funny / cosmetic sounds ──────────────────────────────────

    case 'airhorn':
      // BWAAAH — classic obnoxious horn
      slideTone(180, 155, 0.12, 'sawtooth', 0.18)
      slideTone(155, 140, 0.20, 'sawtooth', 0.16, 0.10)
      slideTone(140, 130, 0.35, 'sawtooth', 0.14, 0.26)
      tone(125, 0.30, 'sawtooth', 0.10, 0.55)
      break

    case 'sadTrombone':
      // Wah wah wah waaah descending slide
      slideTone(370, 340, 0.18, 'sawtooth', 0.11)
      slideTone(330, 300, 0.18, 'sawtooth', 0.11, 0.22)
      slideTone(295, 265, 0.18, 'sawtooth', 0.11, 0.44)
      slideTone(260, 195, 0.40, 'sawtooth', 0.12, 0.66)
      break

    case 'rimshot':
      // Ba dum — tss
      tone(80,  0.06, 'sine',     0.16)           // kick 1
      tone(65,  0.08, 'sine',     0.13, 0.08)     // kick tail
      tone(90,  0.05, 'sine',     0.14, 0.22)     // kick 2
      tone(75,  0.08, 'sine',     0.11, 0.27)     // kick tail
      tone(2800, 0.12, 'square',  0.04, 0.42)     // snare crack
      tone(4000, 0.22, 'square',  0.025, 0.44)    // hi-hat hiss
      break

    case 'cashRegister':
      // Cha-ching! classic register bell
      tone(1318, 0.05, 'sine', 0.10)
      tone(2093, 0.08, 'sine', 0.13, 0.07)
      tone(1661, 0.06, 'sine', 0.08, 0.17)
      tone(2637, 0.30, 'sine', 0.12, 0.25)
      tone(1976, 0.20, 'sine', 0.07, 0.30)
      break

    case 'laser':
      // Pew pew — rapid descending zap
      slideTone(1400, 400, 0.14, 'square', 0.10)
      slideTone(1200, 350, 0.12, 'square', 0.08, 0.18)
      break

    case 'fart':
      // 💨 low wobbling noise burst
      slideTone(75, 55, 0.08, 'sawtooth', 0.15)
      slideTone(60, 45, 0.12, 'sawtooth', 0.13, 0.06)
      slideTone(50, 40, 0.16, 'sawtooth', 0.11, 0.16)
      slideTone(42, 35, 0.20, 'sawtooth', 0.08, 0.29)
      break

    case 'ding':
      // Pure clean bell
      tone(1046, 0.04, 'sine', 0.14)
      tone(1046, 0.60, 'sine', 0.09, 0.04)
      tone(2093, 0.25, 'sine', 0.04, 0.04)
      break

    case 'powerUp':
      // 8-bit ascending arpeggio — classic Nintendo power-up
      tone(261, 0.07, 'square', 0.08)
      tone(329, 0.07, 'square', 0.08, 0.08)
      tone(392, 0.07, 'square', 0.08, 0.16)
      tone(523, 0.07, 'square', 0.10, 0.24)
      tone(659, 0.07, 'square', 0.10, 0.32)
      tone(784, 0.07, 'square', 0.11, 0.40)
      tone(1046, 0.25, 'square', 0.13, 0.48)
      break

    // ── Premium / épique sounds ──────────────────────────────────

    case 'siren':
      // Police/alarm wail — for wrong answers
      slideTone(700, 500, 0.20, 'sawtooth', 0.10)
      slideTone(500, 700, 0.20, 'sawtooth', 0.10, 0.22)
      slideTone(700, 500, 0.20, 'sawtooth', 0.09, 0.44)
      break

    case 'gong':
      // Deep resonant gong strike
      tone(80,  0.05, 'sine', 0.18)
      tone(80,  1.20, 'sine', 0.14, 0.04)
      tone(160, 0.08, 'sine', 0.09, 0.02)
      tone(240, 0.30, 'sine', 0.05, 0.01)
      break

    case 'thunder':
      // Lightning crack + deep rumble
      slideTone(800, 100, 0.08, 'sawtooth', 0.16)
      tone(60,  0.40, 'sawtooth', 0.12, 0.06)
      tone(50,  0.60, 'sawtooth', 0.09, 0.30)
      tone(40,  0.50, 'sawtooth', 0.06, 0.70)
      break

    case 'bassDrop':
      // Heavy EDM-style bass drop
      slideTone(200, 40, 0.30, 'sawtooth', 0.18)
      tone(40, 0.60, 'sawtooth', 0.16, 0.28)
      tone(80, 0.10, 'sine',     0.12, 0.05)
      tone(160,0.06, 'square',   0.08, 0.00)
      break

    case 'epicReveal':
      // Dramatic cinematic build + impact
      slideTone(220, 440, 0.30, 'sawtooth', 0.06)
      slideTone(330, 660, 0.30, 'sawtooth', 0.06, 0.05)
      tone(440, 0.06, 'sine', 0.12, 0.32)
      tone(554, 0.06, 'sine', 0.13, 0.40)
      tone(659, 0.06, 'sine', 0.14, 0.48)
      tone(880, 0.08, 'sine', 0.16, 0.56)
      tone(1109,0.60, 'sine', 0.18, 0.64)
      tone(80,  0.40, 'sawtooth', 0.12, 0.60)
      break
  }
}
