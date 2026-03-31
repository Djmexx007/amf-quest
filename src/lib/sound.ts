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

export function playSound(type: 'buy' | 'equip' | 'hoverRare' | 'openChest' | 'legendaryDrop' | 'error') {
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
  }
}
