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

// Pure tone with envelope
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
  } catch { /* ignore */ }
}

// Pitch-sliding tone
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
  } catch { /* ignore */ }
}

// White noise burst — used for percussion, crack, click
function noise(duration: number, volume = 0.12, delay = 0, highpassHz = 0) {
  const c = getCtx()
  if (!c) return
  try {
    const len    = Math.ceil(c.sampleRate * (duration + 0.05))
    const buffer = c.createBuffer(1, len, c.sampleRate)
    const data   = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src  = c.createBufferSource()
    src.buffer = buffer
    const gain = c.createGain()
    gain.gain.setValueAtTime(0, c.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration)
    if (highpassHz > 0) {
      const hpf = c.createBiquadFilter()
      hpf.type = 'highpass'
      hpf.frequency.value = highpassHz
      src.connect(hpf)
      hpf.connect(gain)
    } else {
      src.connect(gain)
    }
    gain.connect(c.destination)
    src.start(c.currentTime + delay)
    src.stop(c.currentTime + delay + duration + 0.05)
  } catch { /* ignore */ }
}

export type SoundType =
  | 'buy' | 'equip' | 'hoverRare' | 'openChest' | 'legendaryDrop' | 'error'
  | 'airhorn' | 'sadTrombone' | 'rimshot' | 'cashRegister' | 'laser' | 'fart'
  | 'ding' | 'powerUp' | 'siren' | 'gong' | 'thunder' | 'bassDrop' | 'epicReveal'

export function playSound(type: SoundType) {
  switch (type) {

    // ── Système ──────────────────────────────────────────────────────

    case 'buy':
      // Chime ascendant satisfaisant (C-E-G)
      tone(523, 0.07, 'triangle', 0.10)
      tone(659, 0.07, 'triangle', 0.10, 0.09)
      tone(784, 0.20, 'triangle', 0.11, 0.18)
      break

    case 'equip':
      // Double ping court et propre
      tone(880, 0.05, 'sine', 0.10)
      tone(1108, 0.14, 'sine', 0.10, 0.07)
      break

    case 'hoverRare':
      tone(1400, 0.035, 'sine', 0.04)
      break

    case 'openChest':
      // Roulement crescendo + burst
      noise(0.06, 0.08)
      noise(0.06, 0.10, 0.07)
      noise(0.06, 0.12, 0.14)
      tone(440, 0.06, 'sine', 0.10, 0.22)
      tone(660, 0.08, 'sine', 0.12, 0.29)
      tone(880, 0.30, 'sine', 0.14, 0.38)
      break

    case 'legendaryDrop':
      // Fanfare dorée
      tone(440,  0.07, 'sine', 0.09)
      tone(554,  0.07, 'sine', 0.09, 0.09)
      tone(659,  0.07, 'sine', 0.10, 0.18)
      tone(880,  0.07, 'sine', 0.12, 0.27)
      tone(1109, 0.55, 'sine', 0.15, 0.36)
      tone(1319, 0.35, 'sine', 0.08, 0.52)
      break

    case 'error':
      tone(280, 0.10, 'sawtooth', 0.09)
      tone(200, 0.18, 'sawtooth', 0.07, 0.12)
      break

    // ── Sons cosmétiques ─────────────────────────────────────────────

    case 'fart':
      // 💨 Grognement graveleux très grave (30-65 Hz), sawtooth humide
      // Caractère : ultra grave, baveux, inimitable
      slideTone(62, 44, 0.07, 'sawtooth', 0.18)
      slideTone(46, 33, 0.11, 'sawtooth', 0.16, 0.05)
      slideTone(35, 27, 0.15, 'sawtooth', 0.13, 0.14)
      slideTone(29, 23, 0.22, 'sawtooth', 0.09, 0.27)
      break

    case 'ding':
      // 🔔 Cloche pure et brillante — longue résonance sine
      // Caractère : aigu, cristallin, long sustain, rien d'autre
      tone(1318, 0.02, 'sine', 0.14)             // attaque transiente
      tone(1046, 0.03, 'sine', 0.11, 0.02)       // fondamentale
      tone(1046, 0.90, 'sine', 0.09, 0.04)       // sustain long
      tone(2093, 0.35, 'sine', 0.04, 0.04)       // 2e harmonique
      tone(3136, 0.18, 'sine', 0.015, 0.04)      // 3e harmonique shimmer
      break

    case 'rimshot':
      // 🥁 Ba-dum-TSSSS — vraie batterie (kick + caisse claire bruit + charley)
      // Caractère : percussif rythmique, noise-based — rien de mélodique
      tone(80, 0.04, 'sine', 0.22)               // kick punch
      tone(55, 0.10, 'sine', 0.16, 0.02)         // kick queue
      noise(0.04, 0.22, 0.24)                    // snare crack (bruit large)
      tone(220, 0.08, 'triangle', 0.09, 0.24)    // corps caisse
      noise(0.14, 0.10, 0.24, 1500)              // snare sizzle
      noise(0.06, 0.06, 0.42, 7000)              // charley fermé
      noise(0.22, 0.05, 0.44, 5000)              // charley hiss
      break

    case 'airhorn':
      // 📯 BWAAAH ! — cor à air obnoxieux à haute fréquence
      // Caractère : 300-340 Hz sawtooth fort et soutenu — beaucoup plus haut que le trombone
      slideTone(340, 305, 0.12, 'sawtooth', 0.22)
      tone(300, 0.55, 'sawtooth', 0.20, 0.10)
      tone(600, 0.60, 'sawtooth', 0.08, 0.08)   // harmonique
      tone(900, 0.40, 'sawtooth', 0.04, 0.10)   // 3e harmonique
      break

    case 'sadTrombone':
      // 😢 Wah-wah-wah-waaah — glissades musicales descendantes
      // Caractère : pattern musical en 4 étapes, plus bas que l'airhorn (195-392 Hz)
      slideTone(392, 370, 0.18, 'sawtooth', 0.13)           // Wah 1 (G→F#)
      slideTone(349, 330, 0.18, 'sawtooth', 0.13, 0.22)     // Wah 2 (F→E)
      slideTone(311, 294, 0.18, 'sawtooth', 0.13, 0.44)     // Wah 3 (Eb→D)
      slideTone(277, 196, 0.42, 'sawtooth', 0.14, 0.66)     // Waaah (Db→G2)
      break

    case 'cashRegister':
      // 🛎 Cha-CHING ! — clic mécanique net + carillon ascendant
      // Caractère : transient de bruit abrupt PUIS cloches montantes — structure unique
      noise(0.008, 0.22, 0)                      // clic mécanique
      noise(0.015, 0.14, 0.018, 3000)            // queue du clic
      tone(1318, 0.04, 'sine', 0.09, 0.06)       // carillon 1
      tone(1661, 0.04, 'sine', 0.08, 0.12)       // carillon 2
      tone(2093, 0.04, 'sine', 0.10, 0.18)       // carillon 3
      tone(2637, 0.32, 'sine', 0.14, 0.24)       // cha-CHING final
      tone(3136, 0.22, 'sine', 0.05, 0.26)       // shimmer
      break

    case 'laser':
      // ⚡ Pew ! — sweep ultra-rapide square du très aigu au très grave
      // Caractère : 1800→80 Hz en 0.12s — le plus rapide de tous les sons
      slideTone(1800, 80,  0.12, 'square', 0.13)
      slideTone(2400, 120, 0.09, 'square', 0.06, 0.03)
      break

    case 'powerUp':
      // 🎮 8-bit champion — arpège ascendant do majeur en carrés
      // Caractère : marches régulières montantes, wave carré, gamme C4→E6
      tone(261,  0.06, 'square', 0.09)
      tone(330,  0.06, 'square', 0.09, 0.07)
      tone(392,  0.06, 'square', 0.09, 0.14)
      tone(523,  0.06, 'square', 0.10, 0.21)
      tone(659,  0.06, 'square', 0.10, 0.28)
      tone(784,  0.06, 'square', 0.11, 0.35)
      tone(1046, 0.06, 'square', 0.12, 0.42)
      tone(1318, 0.30, 'square', 0.14, 0.49)
      break

    case 'siren':
      // 🚨 Sirène de police — alternance stricte deux fréquences
      // Caractère : triangle (aigu perçant), 600↔900 Hz, pas de glissement
      tone(900, 0.22, 'triangle', 0.12)
      tone(600, 0.22, 'triangle', 0.12, 0.24)
      tone(900, 0.22, 'triangle', 0.11, 0.48)
      tone(600, 0.18, 'triangle', 0.09, 0.72)
      break

    case 'gong':
      // 🪘 Gong impérial — impact de bruit + résonance profonde très longue
      // Caractère : 65 Hz sine uniquement, déclin de 1.6s — le plus long et le plus grave
      noise(0.018, 0.22, 0)                      // frappe initiale
      tone(65,  0.04, 'sine', 0.22, 0.01)        // fondamentale impact
      tone(65,  1.60, 'sine', 0.17, 0.04)        // longue résonance
      tone(130, 0.30, 'sine', 0.07, 0.02)        // 2e harmonique courte
      tone(195, 0.12, 'sine', 0.03, 0.01)        // 3e harmonique
      break

    case 'thunder':
      // ⛈ Tonnerre — crack de bruit blanc + grondement sub-grave pur
      // Caractère : burst de noise (foudre) PUIS sines graves uniquement, zéro sawtooth
      noise(0.06, 0.24, 0)                       // foudre crack
      noise(0.09, 0.18, 0.04, 200)               // écho crack
      tone(55, 0.55, 'sine', 0.17, 0.08)         // grondement
      tone(45, 0.75, 'sine', 0.13, 0.40)         // grondement profond
      tone(35, 0.65, 'sine', 0.08, 0.85)         // queue sub
      break

    case 'bassDrop':
      // 🔊 Bass Drop EDM — chute sine pure 120→40 Hz, sustain sub-grave
      // Caractère : sine (lisse, pas sawtooth) — grave EDM propre vs grave saleteux du fart
      tone(160, 0.07, 'sine', 0.15)              // punch initial
      slideTone(120, 40, 0.26, 'sine', 0.22, 0.06)  // THE DROP (sine = propre)
      tone(40,  0.75, 'sine', 0.19, 0.28)        // sustain sub 40 Hz
      tone(80,  0.16, 'sine', 0.08, 0.28)        // harmonique 2
      break

    case 'epicReveal':
      // 🎬 Révélation épique — gamme cinématique sine lente + accord d'impact
      // Caractère : sine (doux), montée lente sur 0.55s, puis accord A-E-A sur 3 octaves
      tone(220,  0.09, 'sine', 0.07)             // A3
      tone(277,  0.09, 'sine', 0.07, 0.08)       // C#4
      tone(330,  0.09, 'sine', 0.08, 0.16)       // E4
      tone(440,  0.09, 'sine', 0.09, 0.24)       // A4
      tone(554,  0.09, 'sine', 0.10, 0.32)       // C#5
      tone(659,  0.09, 'sine', 0.11, 0.40)       // E5
      tone(880,  0.09, 'sine', 0.12, 0.48)       // A5
      // Impact final — accord plein
      tone(110,  0.65, 'sine', 0.16, 0.58)       // basse A2
      tone(440,  0.65, 'sine', 0.14, 0.58)       // A4
      tone(659,  0.65, 'sine', 0.12, 0.58)       // E5
      tone(880,  0.65, 'sine', 0.10, 0.58)       // A5
      break
  }
}
