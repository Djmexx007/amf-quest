'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, RotateCcw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

interface Card {
  suit: Suit
  rank: Rank
  hidden?: boolean
}

type Phase = 'loading' | 'betting' | 'playing' | 'dealer' | 'result'
type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust'

// ── Helpers ────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ── Deck utilities ─────────────────────────────────────────────────────────────
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RED_SUITS = new Set<Suit>(['♥', '♦'])

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (let d = 0; d < 6; d++)
    for (const suit of SUITS)
      for (const rank of RANKS)
        deck.push({ suit, rank })
  return shuffled(deck)
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function handTotal(cards: Card[]): number {
  const visible = cards.filter(c => !c.hidden)
  let total = 0
  let aces = 0
  for (const c of visible) {
    if (c.rank === 'A') { total += 11; aces++ }
    else if (['J', 'Q', 'K'].includes(c.rank)) total += 10
    else total += parseInt(c.rank)
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function isNaturalBJ(hand: Card[]): boolean {
  return hand.length === 2 && handTotal(hand) === 21
}

// ── Card component ─────────────────────────────────────────────────────────────
const DEAL_STYLE: React.CSSProperties = {
  animation: 'dealCard 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both',
}

function PlayingCard({ card }: { card: Card }) {
  if (card.hidden) {
    return (
      <div
        className="w-14 h-20 rounded-xl border border-white/10 flex items-center justify-center shadow-2xl select-none flex-shrink-0"
        style={{ background: 'linear-gradient(145deg, #1e3a5f 0%, #0c1e35 100%)', ...DEAL_STYLE }}
      >
        <div
          className="w-10 h-16 rounded-lg flex items-center justify-center border border-[#D4A843]/15"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(212,168,67,0.04) 0, rgba(212,168,67,0.04) 1px, transparent 0, transparent 50%)',
            backgroundSize: '8px 8px',
          }}
        >
          <span className="font-cinzel font-bold text-lg text-[#D4A843]/30">?</span>
        </div>
      </div>
    )
  }

  const isRed = RED_SUITS.has(card.suit)
  return (
    <div
      className="w-14 h-20 rounded-xl border border-gray-200 shadow-2xl flex flex-col justify-between p-1.5 select-none flex-shrink-0"
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%)',
        color: isRed ? '#c0182e' : '#111827',
        ...DEAL_STYLE,
      }}
    >
      <div className="leading-none">
        <div className="text-xs font-extrabold">{card.rank}</div>
        <div className="text-sm leading-none">{card.suit}</div>
      </div>
      <div className="text-center text-xl leading-none">{card.suit}</div>
      <div className="leading-none text-right rotate-180">
        <div className="text-xs font-extrabold">{card.rank}</div>
        <div className="text-sm leading-none">{card.suit}</div>
      </div>
    </div>
  )
}

// ── Score badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ value, bust }: { value: number; bust?: boolean }) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{
        background: bust ? 'rgba(255,77,106,0.2)' : value === 21 ? 'rgba(212,168,67,0.2)' : 'rgba(255,255,255,0.1)',
        color: bust ? '#FF4D6A' : value === 21 ? '#D4A843' : '#e5e7eb',
      }}
    >
      {value}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BlackjackPage() {
  const router = useRouter()

  const [phase, setPhase]           = useState<Phase>('loading')
  const [coins, setCoins]           = useState(0)
  const [charId, setCharId]         = useState<string | null>(null)
  const [deck, setDeck]             = useState<Card[]>([])
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [activeBet, setActiveBet]   = useState(0)
  const [pendingBet, setPendingBet] = useState(100)
  const [outcome, setOutcome]       = useState<Outcome | null>(null)
  const [busy, setBusy]             = useState(false)
  const [err, setErr]               = useState<string | null>(null)
  const [stats, setStats]           = useState({ w: 0, l: 0, p: 0 })
  const [netGain, setNetGain]       = useState(0)

  // Load god's character and coins
  useEffect(() => {
    fetch('/api/god/blackjack')
      .then(r => r.json())
      .then(d => {
        setCoins(d.coins ?? 0)
        setCharId(d.character_id ?? null)
        setDeck(buildDeck())
        setPhase('betting')
      })
      .catch(() => setErr('Impossible de charger vos données.'))
  }, [])

  const freshDeck = useCallback((current: Card[]) => {
    return current.length < 20 ? buildDeck() : current
  }, [])

  // ── API helpers ──────────────────────────────────────────────────────────────
  async function deduct(amount: number): Promise<number | null> {
    const res = await fetch('/api/god/blackjack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deduct', amount, character_id: charId }),
    })
    const data = await res.json()
    if (!res.ok) { setErr(data.error ?? 'Erreur.'); return null }
    return data.coins as number
  }

  async function payout(amount: number) {
    if (amount <= 0 || !charId) return
    const res = await fetch('/api/god/blackjack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'payout', amount, character_id: charId }),
    })
    const data = await res.json()
    if (res.ok && data.coins !== undefined) setCoins(data.coins as number)
  }

  // ── Game logic ───────────────────────────────────────────────────────────────
  async function finalize(pHand: Card[], dHand: Card[], bet: number, forcedOutcome?: Outcome) {
    const pVal = handTotal(pHand)
    const dVal = handTotal(dHand)

    let o: Outcome
    if (forcedOutcome) {
      o = forcedOutcome
    } else if (pVal > 21) {
      o = 'bust'
    } else if (dVal > 21 || pVal > dVal) {
      o = 'win'
    } else if (pVal === dVal) {
      o = 'push'
    } else {
      o = 'lose'
    }

    setOutcome(o)
    setPhase('result')

    let winAmount = 0
    if (o === 'blackjack') winAmount = bet + Math.floor(bet * 1.5) // 3:2 payout
    else if (o === 'win')  winAmount = bet * 2                      // 1:1 + bet back
    else if (o === 'push') winAmount = bet                          // bet returned

    if (winAmount > 0) await payout(winAmount)

    const gain = winAmount - bet
    setNetGain(prev => prev + gain)
    setStats(prev => ({
      w: prev.w + (['win', 'blackjack'].includes(o) ? 1 : 0),
      l: prev.l + (['lose', 'bust'].includes(o) ? 1 : 0),
      p: prev.p + (o === 'push' ? 1 : 0),
    }))
  }

  async function runDealerTurn(pHand: Card[], dHand: Card[], curDeck: Card[], bet: number) {
    setPhase('dealer')

    // Dramatic pause before flipping the hidden card
    await sleep(700)

    // Reveal hidden card — key change forces remount → entrance animation acts as flip
    let revealed = dHand.map(c => ({ ...c, hidden: false }))
    setDealerHand([...revealed])

    // Dealer draws to 17+ one card at a time
    if (handTotal(pHand) <= 21) {
      let d = [...curDeck]
      while (handTotal(revealed) < 17) {
        await sleep(900)
        const card = d.pop()!
        revealed = [...revealed, card]
        setDealerHand([...revealed])
      }
      setDeck(d)
    }

    // Short pause before showing outcome
    await sleep(600)
    await finalize(pHand, revealed, bet)
  }

  async function startHand() {
    if (!charId || pendingBet <= 0 || pendingBet > coins || busy) return
    setBusy(true)
    setErr(null)
    setOutcome(null)

    try {
      const remaining = await deduct(pendingBet)
      if (remaining === null) return
      setCoins(remaining)

      const d = [...freshDeck(deck)]
      const p1 = d.pop()!
      const d1 = d.pop()!
      const p2 = d.pop()!
      const d2 = { ...d.pop()!, hidden: true }

      // Deal cards one at a time for suspense
      setPlayerHand([p1]);              await sleep(320)
      setDealerHand([d1]);              await sleep(320)
      setPlayerHand([p1, p2]);          await sleep(320)
      setDealerHand([d1, d2]);          await sleep(200)

      const pHand = [p1, p2]
      const dHand = [d1, d2]

      setDeck(d)
      setActiveBet(pendingBet)

      const pBJ = isNaturalBJ(pHand)
      const dBJ = isNaturalBJ([d1, { ...d2, hidden: false }])

      if (pBJ) {
        const revealed = dHand.map(c => ({ ...c, hidden: false }))
        setDealerHand(revealed)
        setPhase('dealer')
        await finalize(pHand, revealed, pendingBet, dBJ ? 'push' : 'blackjack')
      } else {
        setPhase('playing')
      }
    } finally {
      setBusy(false)
    }
  }

  function hit() {
    if (phase !== 'playing' || busy) return
    const d = [...deck]
    const card = d.pop()!
    const newHand = [...playerHand, card]
    setDeck(d)
    setPlayerHand(newHand)

    if (handTotal(newHand) >= 21) {
      runDealerTurn(newHand, dealerHand, d, activeBet)
    }
  }

  function stand() {
    if (phase !== 'playing') return
    runDealerTurn(playerHand, dealerHand, deck, activeBet)
  }

  async function doubleDown() {
    if (phase !== 'playing' || busy || coins < activeBet || playerHand.length !== 2) return
    setBusy(true)
    setErr(null)

    try {
      const remaining = await deduct(activeBet)
      if (remaining === null) return
      setCoins(remaining)

      const newBet = activeBet * 2
      setActiveBet(newBet)

      const d = [...deck]
      const card = d.pop()!
      const newHand = [...playerHand, card]
      setDeck(d)
      setPlayerHand(newHand)

      await runDealerTurn(newHand, dealerHand, d, newBet)
    } finally {
      setBusy(false)
    }
  }

  function newHand() {
    setOutcome(null)
    setPlayerHand([])
    setDealerHand([])
    setActiveBet(0)
    setPhase('betting')
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const playerTotal = handTotal(playerHand)
  const dealerShownTotal = handTotal(dealerHand.filter(c => !c.hidden))

  const OUTCOME_CONFIG: Record<Outcome, { label: string; sub: string; color: string }> = {
    blackjack: { label: '♠ BLACKJACK ♥',     sub: `Paiement 3:2 — +${Math.floor(activeBet * 1.5)} coins`, color: '#D4A843' },
    win:       { label: 'VICTOIRE',           sub: `+${activeBet} coins`,                                    color: '#25C292' },
    push:      { label: 'ÉGALITÉ',            sub: 'Mise remboursée',                                        color: '#4D8BFF' },
    lose:      { label: 'PERDU',              sub: `-${activeBet} coins`,                                    color: '#FF4D6A' },
    bust:      { label: 'BUST — DÉPASSÉ 21', sub: `-${activeBet} coins`,                                    color: '#FF4D6A' },
  }

  const BET_PRESETS = [50, 100, 500, 1000, 5000]

  // ── Render ───────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🃏</div>
          <p className="text-gray-400 text-sm">Chargement de la table secrète…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container max-w-xl mx-auto space-y-5">
      <style>{`
        @keyframes dealCard {
          from { transform: translateY(-40px) scale(0.82) rotate(-4deg); opacity: 0; }
          to   { transform: translateY(0)     scale(1)    rotate(0deg);  opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/god')}
            className="p-2 rounded-lg transition-colors text-gray-500 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-cinzel text-xl font-bold text-white tracking-widest">
              ♠ BLACK JACK ♥
            </h1>
            <p className="text-gray-600 text-xs tracking-wider">TABLE SECRÈTE DES DIEUX</p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}
        >
          <Wallet size={14} style={{ color: '#D4A843' }} />
          <span className="font-bold text-sm" style={{ color: '#D4A843' }}>
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Session stats ── */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { label: 'Victoires', value: stats.w, color: '#25C292' },
          { label: 'Défaites',  value: stats.l, color: '#FF4D6A' },
          { label: 'Égalités',  value: stats.p, color: '#4D8BFF' },
          {
            label: 'Net',
            value: (netGain >= 0 ? '+' : '') + netGain.toLocaleString(),
            color: netGain >= 0 ? '#25C292' : '#FF4D6A',
          },
        ].map(s => (
          <div key={s.label} className="rpg-card py-2.5">
            <p className="font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
            <p className="text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div
        className="rpg-card overflow-hidden relative"
        style={{ background: 'linear-gradient(180deg, #071122 0%, #0a1628 100%)', minHeight: 340 }}
      >
        {/* Felt glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(10,50,30,0.4) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 p-6 flex flex-col gap-6">

          {/* Dealer hand */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs tracking-widest uppercase font-medium">Croupier</span>
              {dealerHand.length > 0 && phase !== 'playing' && (
                <ScoreBadge value={dealerShownTotal} bust={dealerShownTotal > 21} />
              )}
              {phase === 'playing' && dealerHand.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
                >
                  {dealerShownTotal}+?
                </span>
              )}
            </div>
            {dealerHand.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {dealerHand.map((card, i) => <PlayingCard key={`${i}-${card.hidden}`} card={card} />)}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center">
                <span className="text-gray-700 text-xs tracking-widest">EN ATTENTE</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(212,168,67,0.12)' }} />
            <span className="text-[#D4A843]/25 text-xs font-cinzel tracking-[0.3em]">VS</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(212,168,67,0.12)' }} />
          </div>

          {/* Player hand */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs tracking-widest uppercase font-medium">Vous</span>
              {playerHand.length > 0 && (
                <ScoreBadge value={playerTotal} bust={playerTotal > 21} />
              )}
            </div>
            {playerHand.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {playerHand.map((card, i) => <PlayingCard key={`${i}-${card.hidden}`} card={card} />)}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-1 opacity-30">🃏</div>
                  <span className="text-gray-700 text-xs tracking-widest">PLACEZ VOS PARIS</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Outcome overlay */}
        {outcome && (
          <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[2px]">
            <div
              className="px-10 py-5 rounded-2xl text-center border shadow-2xl"
              style={{
                background: `color-mix(in srgb, ${OUTCOME_CONFIG[outcome].color} 12%, #0a1628)`,
                borderColor: `${OUTCOME_CONFIG[outcome].color}35`,
              }}
            >
              <p className="font-cinzel font-bold text-2xl tracking-wider" style={{ color: OUTCOME_CONFIG[outcome].color }}>
                {OUTCOME_CONFIG[outcome].label}
              </p>
              <p className="text-gray-400 text-sm mt-1">{OUTCOME_CONFIG[outcome].sub}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls ── */}

      {/* Betting phase */}
      {phase === 'betting' && (
        <div className="rpg-card p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="tracking-wider uppercase">Votre mise</span>
            <span>Balance: <strong style={{ color: '#D4A843' }}>{coins.toLocaleString()}</strong></span>
          </div>

          {/* Quick bets */}
          <div className="flex gap-2">
            {BET_PRESETS.map(b => (
              <button
                key={b}
                onClick={() => setPendingBet(b)}
                disabled={b > coins}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-20"
                style={
                  pendingBet === b
                    ? { background: 'rgba(212,168,67,0.18)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.35)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {b >= 1000 ? `${b / 1000}k` : b}
              </button>
            ))}
            <button
              onClick={() => setPendingBet(coins)}
              disabled={coins <= 0}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-20"
              style={
                pendingBet === coins && coins > 0
                  ? { background: 'rgba(212,168,67,0.18)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              MAX
            </button>
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={pendingBet}
              min={1}
              max={coins}
              onChange={e => {
                const v = parseInt(e.target.value) || 1
                setPendingBet(Math.max(1, Math.min(coins, v)))
              }}
              className="flex-1 px-4 py-2.5 rounded-lg text-center text-white font-bold text-lg border focus:outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {/* Deal */}
          <button
            onClick={startHand}
            disabled={pendingBet <= 0 || pendingBet > coins || busy || !charId}
            className="w-full py-3.5 rounded-xl font-cinzel font-bold text-sm tracking-widest transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #D4A843 0%, #B8902D 100%)',
              color: '#06090f',
              boxShadow: '0 4px 24px rgba(212,168,67,0.25)',
            }}
          >
            {busy ? '…' : `MISER ${pendingBet.toLocaleString()} — DEAL`}
          </button>

          {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          {!charId && (
            <p className="text-yellow-600 text-xs text-center">
              Aucun personnage trouvé. Rejoignez une branche d'abord.
            </p>
          )}
        </div>
      )}

      {/* Playing phase */}
      {phase === 'playing' && (
        <div className="rpg-card p-4 space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Mise: <strong style={{ color: '#D4A843' }}>{activeBet.toLocaleString()}</strong></span>
            <span>Balance: <strong style={{ color: '#D4A843' }}>{coins.toLocaleString()}</strong></span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={hit}
              className="py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all active:scale-95"
              style={{ background: 'rgba(37,194,146,0.12)', color: '#25C292', border: '1px solid rgba(37,194,146,0.25)' }}
            >
              HIT
            </button>
            <button
              onClick={stand}
              className="py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all active:scale-95"
              style={{ background: 'rgba(77,139,255,0.12)', color: '#4D8BFF', border: '1px solid rgba(77,139,255,0.25)' }}
            >
              STAND
            </button>
            <button
              onClick={doubleDown}
              disabled={busy || coins < activeBet || playerHand.length !== 2}
              className="py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all active:scale-95 disabled:opacity-30"
              style={{ background: 'rgba(212,168,67,0.12)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.25)' }}
            >
              DOUBLE
            </button>
          </div>
          {err && <p className="text-red-400 text-xs text-center">{err}</p>}
        </div>
      )}

      {/* Dealer turn */}
      {phase === 'dealer' && !outcome && (
        <div className="rpg-card p-4 text-center">
          <p className="text-gray-500 text-xs tracking-widest animate-pulse uppercase">Tour du croupier…</p>
        </div>
      )}

      {/* Result phase */}
      {phase === 'result' && (
        <div className="rpg-card p-4">
          <button
            onClick={newHand}
            className="w-full py-3.5 rounded-xl font-cinzel font-bold text-sm tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #D4A843 0%, #B8902D 100%)',
              color: '#06090f',
              boxShadow: '0 4px 24px rgba(212,168,67,0.25)',
            }}
          >
            <RotateCcw size={15} />
            NOUVELLE MAIN
          </button>
        </div>
      )}

    </div>
  )
}
