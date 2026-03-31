'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ShoppingBag, Zap, Sparkles, Crown, Filter, Flame, Package, Volume2 } from 'lucide-react'
import { playSound, type SoundType } from '@/lib/sound'
import { useUIStore } from '@/stores/uiStore'

interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  item_type: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  cost_coins: number
  effect: Record<string, unknown>
  is_consumable: boolean
  owned: boolean
  equipped: boolean
  locked?: boolean
}

interface BoxReward {
  label: string
  xp: number
  coins: number
  tier: string        // rarity of the reward
  chestTier?: string  // tier of the chest (novice/elite/legendary)
  levelUp?: boolean
  item?: { id: string; name: string; icon: string; rarity: string }
}

const RC = {
  common:    { label: 'Commun',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)', glow: '',                               cls: '' },
  rare:      { label: 'Rare',       color: '#4D8BFF', bg: 'rgba(77,139,255,0.1)',  border: 'rgba(77,139,255,0.2)',  glow: '0 0 16px rgba(77,139,255,0.15)',  cls: 'rarity-rare' },
  epic:      { label: 'Épique',     color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', glow: '0 0 20px rgba(167,139,250,0.2)', cls: 'rarity-epic' },
  legendary: { label: 'Légendaire', color: '#D4A843', bg: 'rgba(212,168,67,0.1)',  border: 'rgba(212,168,67,0.25)', glow: '0 0 28px rgba(212,168,67,0.25)', cls: 'rarity-legendary' },
}

const BG_PREVIEW: Record<string, { bg: string; stars: string }> = {
  // Originaux
  galaxy:         { bg: 'radial-gradient(ellipse at 20% 50%, #1E0A4A, #0D0625)', stars: 'rgba(180,120,255,0.55)' },
  abyss:          { bg: 'radial-gradient(ellipse at 75% 20%, #041828, #020B18)', stars: 'rgba(0,200,255,0.5)'    },
  golden:         { bg: 'radial-gradient(ellipse at 50% 80%, #2E1A00, #1A0F00)', stars: 'rgba(212,168,67,0.65)'  },
  fire:           { bg: 'radial-gradient(ellipse at 30% 25%, #380900, #1E0500)', stars: 'rgba(255,100,30,0.65)'  },
  cosmic:         { bg: 'radial-gradient(ellipse at 65% 35%, #0C0935, #060518)', stars: 'rgba(100,150,255,0.55)' },
  nebula:         { bg: 'radial-gradient(ellipse at 40% 60%, #2D0835, #160520)', stars: 'rgba(240,100,255,0.6)'  },
  matrix:         { bg: 'radial-gradient(ellipse at 50% 50%, #001E00, #000D00)', stars: 'rgba(0,255,80,0.6)'     },
  diamond:        { bg: 'radial-gradient(ellipse at 60% 35%, #001E30, #000F1C)', stars: 'rgba(100,230,255,0.6)'  },
  // Nouveaux
  aurora:         { bg: 'radial-gradient(ellipse at 25% 75%, #003328, #001A16)', stars: 'rgba(0,255,180,0.6)'    },
  ocean:          { bg: 'radial-gradient(ellipse at 50% 25%, #001535, #000A20)', stars: 'rgba(0,120,255,0.6)'    },
  forest:         { bg: 'radial-gradient(ellipse at 35% 65%, #0A1800, #050D00)', stars: 'rgba(80,200,50,0.6)'    },
  sunset:         { bg: 'radial-gradient(ellipse at 50% 100%, #3A1000, #200800)', stars: 'rgba(255,140,40,0.7)'  },
  volcanic:       { bg: 'radial-gradient(ellipse at 30% 0%, #281000, #160600)', stars: 'rgba(255,80,20,0.6)'     },
  neon:           { bg: 'radial-gradient(ellipse at 50% 80%, #150030, #08001A)', stars: 'rgba(200,80,255,0.7)'   },
  holographic:    { bg: 'radial-gradient(ellipse at 25% 75%, #001535, #001A18)', stars: 'rgba(0,220,255,0.65)'   },
  toxic:          { bg: 'radial-gradient(ellipse at 55% 45%, #122000, #090F00)', stars: 'rgba(150,255,50,0.65)'  },
  vortex:         { bg: 'radial-gradient(ellipse at 50% 50%, #06000F, #030008)', stars: 'rgba(160,60,255,0.6)'   },
  astral:         { bg: 'radial-gradient(ellipse at 45% 55%, #0A051E, #050310)', stars: 'rgba(120,150,255,0.6)'  },
  interstellaire: { bg: 'radial-gradient(ellipse at 50% 50%, #010208, #000103)', stars: 'rgba(200,220,255,0.5)'  },
  neant:          { bg: 'radial-gradient(ellipse at 50% 50%, #020202, #010101)', stars: 'rgba(100,100,100,0.3)'  },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  all:      { label: 'Tout',       icon: <ShoppingBag size={14} /> },
  boost:    { label: 'Boosts',     icon: <Zap size={14} /> },
  title:    { label: 'Titres',     icon: <Crown size={14} /> },
  cosmetic: { label: 'Cosmétique', icon: <Sparkles size={14} /> },
  son:      { label: 'Sons',       icon: <Volume2 size={14} /> },
  coffre:   { label: 'Coffres',    icon: <Package size={14} /> },
}

const SOUND_LABELS: Record<string, string> = {
  airhorn:      '📯 Air Horn',
  sadTrombone:  '😢 Trombone Triste',
  rimshot:      '🥁 Ba Dum Tss',
  cashRegister: '💸 Cha-Ching',
  laser:        '⚡ Laser',
  fart:         '💨 Pffft',
  ding:         '🔔 Ding',
  powerUp:      '🎵 8-Bit Power Up',
  siren:        '🚨 Sifflet/Sirène',
  gong:         '🔔 Gong Impérial',
  thunder:      '⛈️ Tonnerre',
  bassDrop:     '🎧 Bass Drop',
  epicReveal:   '🌟 Révélation Épique',
}

function getEffectSummary(item: ShopItem): string | null {
  const e = item.effect
  if (!e) return null
  if (e.sound && e.trigger) {
    const soundLabel = SOUND_LABELS[String(e.sound)] ?? String(e.sound)
    return e.trigger === 'correct'
      ? `${soundLabel} à chaque bonne réponse 🟢`
      : `${soundLabel} à chaque mauvaise réponse 🔴`
  }
  if (e.xp_multiplier && e.coins_multiplier) return `×${e.xp_multiplier} XP + ×${e.coins_multiplier} coins`
  if (e.xp_multiplier)    return `×${e.xp_multiplier} XP sur la prochaine partie`
  if (e.coins_multiplier) return `×${e.coins_multiplier} coins sur la prochaine partie`
  if (e.dungeon_revive)   return 'Ressuscite 1× dans le donjon'
  if (e.mystery_box)      return '🎁 Ouvrir pour obtenir une récompense aléatoire'
  if (e.background)       return `Thème: ${e.background}`
  if (e.title)            return `Titre: "${e.title}"`
  if (e.frame)            return `Cadre: ${e.frame}`
  return null
}

// ── CSGO-style Chest Roulette ────────────────────────────────
const TILE_W = 56
const TILE_GAP = 4
const TILE_FULL = TILE_W + TILE_GAP        // 60px per tile
const VISIBLE_TILES = 7
const WINNER_IDX = 22
const TOTAL_TILES = 30
const ROULETTE_DURATION = 5000             // ms

// Where the strip lands: winner tile centered in the 7-tile window
const ROULETTE_TARGET_X = -(
  WINNER_IDX * TILE_FULL + TILE_W / 2 - (VISIBLE_TILES * TILE_FULL) / 2
) // ≈ -1138px

const CHEST_DIST: Record<string, string[]> = {
  novice:    ['common', 'common', 'common', 'rare', 'rare', 'epic'],
  elite:     ['common', 'rare', 'rare', 'epic', 'epic', 'legendary'],
  legendary: ['rare', 'epic', 'epic', 'legendary', 'legendary'],
}
const RARITY_ICONS: Record<string, string[]> = {
  common:    ['✨', '⚡', '🔑', '💫', '🌱'],
  rare:      ['💎', '🔮', '⚔️', '🛡️', '🌊'],
  epic:      ['🔥', '💥', '👑', '⚜️', '🌙'],
  legendary: ['🏆', '⭐', '🦄', '🎯', '🔱'],
}

function buildRouletteTiles(winnerTier: string, chestTier: string) {
  const dist = CHEST_DIST[chestTier] ?? CHEST_DIST.novice
  return Array.from({ length: TOTAL_TILES }, (_, i) => {
    if (i === WINNER_IDX) {
      const icons = RARITY_ICONS[winnerTier] ?? RARITY_ICONS.common
      return { rarity: winnerTier, icon: icons[0] }
    }
    const r = dist[i % dist.length]
    const icons = RARITY_ICONS[r] ?? RARITY_ICONS.common
    return { rarity: r, icon: icons[i % icons.length] }
  })
}

function ChestModal({ reward, onClose }: { reward: BoxReward; onClose: () => void }) {
  const [phase, setPhase] = useState<'roulette' | 'reveal'>('roulette')
  const rc = RC[reward.tier as keyof typeof RC] ?? RC.common
  const tiles = useRef(buildRouletteTiles(reward.tier, reward.chestTier ?? 'novice')).current

  useEffect(() => {
    playSound('openChest')
    const t = setTimeout(() => {
      setPhase('reveal')
      if (reward.tier === 'legendary' || reward.tier === 'epic') playSound('legendaryDrop')
    }, ROULETTE_DURATION + 500)
    return () => clearTimeout(t)
  }, [reward.tier])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={phase === 'reveal' ? onClose : undefined}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-6 text-center relative"
        style={{
          background: '#0D1020',
          border: `1px solid ${phase === 'reveal' ? rc.border : 'rgba(212,168,67,0.3)'}`,
          boxShadow: phase === 'reveal' ? rc.glow : '0 0 50px rgba(212,168,67,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {phase === 'roulette' ? (
          <>
            <p className="font-cinzel text-white text-base font-bold mb-4 tracking-widest uppercase">
              Ouverture en cours...
            </p>

            {/* Roulette window */}
            <div
              className="relative rounded-xl overflow-hidden mx-auto mb-5"
              style={{
                width: VISIBLE_TILES * TILE_FULL,
                height: 88,
                background: '#080A12',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Winner highlight frame */}
              <div
                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: TILE_FULL,
                  border: '2px solid #D4A843',
                  boxShadow: '0 0 16px rgba(212,168,67,0.5), inset 0 0 10px rgba(212,168,67,0.08)',
                }}
              />
              {/* Fade edges */}
              <div className="absolute inset-y-0 left-0 w-14 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #080A12, transparent)' }} />
              <div className="absolute inset-y-0 right-0 w-14 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, #080A12, transparent)' }} />

              {/* Scrolling strip */}
              <div
                className="absolute top-0 left-0 flex items-center h-full"
                style={{
                  width: TOTAL_TILES * TILE_FULL + TILE_GAP,
                  animation: `roulette-spin ${ROULETTE_DURATION}ms cubic-bezier(0.04, 0.88, 0.18, 1) forwards`,
                }}
              >
                {tiles.map((tile, i) => {
                  const trc = RC[tile.rarity as keyof typeof RC] ?? RC.common
                  const isWinner = i === WINNER_IDX
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg"
                      style={{
                        width: TILE_W,
                        height: 72,
                        marginRight: TILE_GAP,
                        background: isWinner ? `${trc.color}22` : `${trc.color}0E`,
                        border: `1px solid ${isWinner ? trc.color : `${trc.color}35`}`,
                      }}
                    >
                      <span className="text-xl leading-none">{tile.icon}</span>
                      <span className="font-semibold" style={{ color: trc.color, fontSize: '9px', letterSpacing: '0.05em' }}>
                        {trc.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-gray-600 text-xs tracking-wide">Bonne chance...</p>
          </>
        ) : (
          <div className="animate-chest-reveal">
            <div className={`text-6xl mb-4 ${reward.tier === 'legendary' ? 'animate-float' : ''}`}>
              {reward.item ? reward.item.icon : '🎁'}
            </div>
            <p className="font-cinzel text-xl font-black text-white mb-3">
              {reward.item ? 'Item exclusif obtenu !' : 'Coffre ouvert !'}
            </p>
            <div className="mb-4">
              <p
                className={`text-2xl font-bold mb-3 ${reward.tier === 'legendary' ? 'animate-legendary-text' : ''}`}
                style={{ color: rc.color }}
              >
                {reward.label}
              </p>
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: `${rc.color}20`, color: rc.color, border: `1px solid ${rc.color}40` }}
              >
                {rc.label}
              </span>
            </div>
            {reward.xp > 0 && <p className="text-purple-300 text-sm mt-1">+{reward.xp} XP</p>}
            {reward.coins > 0 && <p className="text-yellow-400 text-sm mt-1">+{reward.coins} 🪙</p>}
            {reward.levelUp && (
              <p className="text-green-400 text-sm font-semibold mt-2 animate-pulse">⬆️ Niveau supérieur !</p>
            )}
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded-xl font-cinzel font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
            >
              Super ! ✨
            </button>
          </div>
        )}

        <style>{`
          @keyframes roulette-spin {
            from { transform: translateX(0) }
            to   { transform: translateX(${ROULETTE_TARGET_X}px) }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const { setBgTheme, setEquippedTitle, setSoundOnCorrect, setSoundOnWrong } = useUIStore()
  const [items, setItems] = useState<ShopItem[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [preview, setPreview] = useState<ShopItem | null>(null)
  const [openingBoxId, setOpeningBoxId] = useState<string | null>(null)
  const [chestReward, setChestReward] = useState<BoxReward | null>(null)
  const [bouncingId, setBouncingId] = useState<string | null>(null)
  const hoverSoundRef = useRef<string | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleCardClick(item: ShopItem) {
    setBouncingId(item.id)
    setTimeout(() => setBouncingId(null), 260)
    setPreview(item)
  }

  function handleHover(item: ShopItem) {
    if (item.rarity !== 'common' && hoverSoundRef.current !== item.id) {
      hoverSoundRef.current = item.id
      playSound('hoverRare')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    const apiType = typeFilter === 'coffre' ? 'boost' : typeFilter === 'son' ? 'sound' : typeFilter
    if (apiType !== 'all') params.set('type', apiType)
    if (rarityFilter !== 'all') params.set('rarity', rarityFilter)
    const res = await fetch(`/api/shop/items?${params}`)
    const data = await res.json()
    let fetched: ShopItem[] = (data.items ?? []).filter((i: ShopItem) => i.item_type !== 'avatar')
    if (typeFilter === 'coffre') fetched = fetched.filter(i => !!i.effect?.mystery_box)
    else if (typeFilter === 'boost') fetched = fetched.filter(i => !i.effect?.mystery_box)
    setItems(fetched)
    setCoins(data.coins ?? 0)
    setLoading(false)
  }, [typeFilter, rarityFilter])

  // Initialize equipped cosmetics/sounds from server on mount (survives page refresh)
  useEffect(() => {
    fetch('/api/shop/items')
      .then(r => r.json())
      .then((data) => {
        const all: ShopItem[] = (data.items ?? [])
        const equipped = all.filter(i => i.equipped)
        const bgItem = equipped.find(i => i.item_type === 'cosmetic' && i.effect?.background)
        const titleItem = equipped.find(i => i.item_type === 'title' && i.effect?.title)
        const correctSoundItem = equipped.find(i => i.item_type === 'sound' && i.effect?.trigger === 'correct')
        const wrongSoundItem   = equipped.find(i => i.item_type === 'sound' && i.effect?.trigger === 'wrong')
        setBgTheme(bgItem ? String(bgItem.effect.background) : null)
        setEquippedTitle(titleItem ? String(titleItem.effect.title) : null)
        setSoundOnCorrect(correctSoundItem ? String(correctSoundItem.effect.sound) : null)
        setSoundOnWrong(wrongSoundItem   ? String(wrongSoundItem.effect.sound)   : null)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  async function purchase(item: ShopItem) {
    if (purchasing) return
    setPurchasing(item.id)
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setCoins(data.coins_remaining)
        playSound('buy')
        if (item.is_consumable) {
          await load()
        } else {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: true } : i))
        }
        showToast(`✨ "${item.name}" ${item.is_consumable ? 'activé' : 'acheté'} !`, true)
        setPreview(null)
      } else {
        playSound('error')
        showToast(data.error ?? "Erreur lors de l'achat.", false)
      }
    } finally {
      setPurchasing(null)
    }
  }

  async function openMysteryBox(item: ShopItem) {
    if (!item.owned || openingBoxId) return
    setOpeningBoxId(item.id)
    setPreview(null)
    try {
      const res = await fetch('/api/shop/open-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const data = await res.json()
      if (res.ok) {
        await load()
        setChestReward({ ...data.reward, levelUp: data.level_up, chestTier: (item.effect?.chest_tier as string) ?? 'novice' })
      } else {
        playSound('error')
        showToast(data.error ?? "Erreur lors de l'ouverture.", false)
      }
    } finally {
      setOpeningBoxId(null)
    }
  }

  async function equip(item: ShopItem) {
    if (!item.owned || equipping) return
    setEquipping(item.id)
    const newEquip = !item.equipped
    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, equip: newEquip }),
      })
      if (res.ok) {
        // Play the item's own sound (or default equip ping)
        if (item.item_type === 'sound' && item.effect?.sound) {
          playSound(item.effect.sound as SoundType)
        } else {
          playSound('equip')
        }
        setItems(prev => prev.map(i => {
          if (i.item_type === item.item_type && i.id !== item.id) {
            // Sound items: only unequip those with the same trigger
            if (item.item_type === 'sound' && i.effect?.trigger !== item.effect?.trigger) return i
            return { ...i, equipped: false }
          }
          if (i.id === item.id) return { ...i, equipped: newEquip }
          return i
        }))
        // Apply cosmetic effects immediately
        if (item.item_type === 'cosmetic' && item.effect?.background) {
          setBgTheme(newEquip ? String(item.effect.background) : null)
        } else if (item.item_type === 'title' && item.effect?.title) {
          setEquippedTitle(newEquip ? String(item.effect.title) : null)
        } else if (item.item_type === 'sound' && item.effect?.sound) {
          const setter = item.effect.trigger === 'correct' ? setSoundOnCorrect : setSoundOnWrong
          setter(newEquip ? String(item.effect.sound) : null)
        }
        showToast(
          item.is_consumable
            ? (newEquip ? `🔥 "${item.name}" actif — sera utilisé à la prochaine partie!` : `"${item.name}" désactivé.`)
            : (newEquip ? `"${item.name}" équipé !` : `"${item.name}" déséquipé.`),
          true,
        )
      }
    } finally {
      setEquipping(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShoppingBag size={28} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-white">Boutique</h1>
            <p className="text-gray-500 text-sm">Achète des boosts, cosmétiques et titres exclusifs</p>
          </div>
        </div>
        <div className="rpg-card px-5 py-3 flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-cinzel text-xl font-bold text-[#D4A843]">{coins.toLocaleString()}</span>
          <span className="text-gray-500 text-sm">coins</span>
        </div>
      </div>

      {/* Active boosts banner */}
      {items.some(i => i.equipped && i.is_consumable) && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)' }}>
          <Flame size={16} className="text-[#D4A843] flex-shrink-0" />
          <div>
            <p className="text-[#D4A843] text-sm font-semibold">Boosts actifs — s&apos;appliqueront à ta prochaine partie!</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {items.filter(i => i.equipped && i.is_consumable).map(i => (
                <span key={i.id} className="text-xs text-gray-300">{i.icon} {i.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
            <button key={key} onClick={() => setTypeFilter(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: typeFilter === key ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${typeFilter === key ? '#D4A843' : 'rgba(255,255,255,0.08)'}`,
                color: typeFilter === key ? '#D4A843' : '#6B7280',
              }}>
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto flex-wrap items-center">
          <Filter size={14} className="text-gray-600" />
          {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(r => {
            const conf = r === 'all' ? { label: 'Tout', color: '#6B7280' } : RC[r]
            return (
              <button key={r} onClick={() => setRarityFilter(r)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: rarityFilter === r ? `${conf.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${rarityFilter === r ? conf.color : 'rgba(255,255,255,0.08)'}`,
                  color: rarityFilter === r ? conf.color : '#6B7280',
                }}>
                {r === 'all' ? 'Tout' : RC[r].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rpg-card h-56 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rpg-card p-12 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500">Aucun item dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => {
            const rc = RC[item.rarity]

            // ── Mystery / locked card ──────────────────────────────
            if (item.locked) {
              return (
                <div
                  key={item.id}
                  className="rpg-card p-4 flex flex-col relative overflow-hidden select-none"
                  style={{
                    border: `1px solid ${rc.color}30`,
                    background: `${rc.bg}`,
                    filter: 'saturate(0.4)',
                  }}
                >
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(255,255,255,0.015) 8px, rgba(255,255,255,0.015) 9px)' }} />
                  {/* Rarity badge */}
                  <div className="absolute top-2 right-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${rc.color}20`, color: rc.color, border: `1px solid ${rc.color}30` }}>
                      {rc.label}
                    </span>
                  </div>
                  {/* Lock icon */}
                  <div className="text-4xl text-center mt-4 mb-3">🔒</div>
                  <p className="text-sm font-semibold text-center text-gray-500 mb-1">??? Mystérieux</p>
                  <p className="text-xs text-center mb-3 flex-1" style={{ color: `${rc.color}80` }}>
                    Débloquable depuis les coffres
                  </p>
                  <div className="w-full py-1.5 rounded-lg text-xs font-semibold text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#4B5563' }}>
                    🗝️ Coffre requis
                  </div>
                </div>
              )
            }

            const canAfford = coins >= item.cost_coins
            const bgKey = item.effect?.background as string | undefined
            const bgPreview = bgKey ? BG_PREVIEW[bgKey] : null
            const effectSummary = getEffectSummary(item)
            const isMysteryBox = !!item.effect?.mystery_box
            const isLegendary = item.rarity === 'legendary'
            const isBouncing = bouncingId === item.id
            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                onMouseEnter={() => handleHover(item)}
                className={`rpg-card p-4 flex flex-col cursor-pointer transition-all duration-200 hover:scale-[1.02] relative overflow-hidden ${rc.cls} ${isBouncing ? 'animate-bounce-in' : ''}`}
                style={{
                  border: `1px solid ${item.owned ? rc.border : 'rgba(255,255,255,0.06)'}`,
                  background: bgPreview ? bgPreview.bg : (item.owned ? rc.bg : '#0D1221'),
                  boxShadow: item.owned ? rc.glow : '',
                }}
              >
                {/* Background stars preview */}
                {bgPreview && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-60">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="absolute w-0.5 h-0.5 rounded-full"
                        style={{
                          background: bgPreview.stars,
                          left: `${(i * 37 + 10) % 100}%`,
                          top: `${(i * 53 + 5) % 60}%`,
                        }} />
                    ))}
                  </div>
                )}

                {/* Legendary sweep shimmer */}
                {isLegendary && item.owned && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div
                      className="absolute inset-y-0 w-1/3"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.1), transparent)',
                        animation: 'legendary-sweep 3.5s ease-in-out infinite 1.5s',
                      }}
                    />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: `${rc.color}20`, color: rc.color, border: `1px solid ${rc.color}30` }}>
                    {rc.label}
                  </span>
                  {item.is_consumable && !isMysteryBox && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Consommable
                    </span>
                  )}
                </div>
                {item.equipped && (
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold border ${item.is_consumable ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                      {item.is_consumable ? '🔥 Actif' : 'Équipé'}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`text-4xl text-center mt-4 mb-3 relative z-10 ${isLegendary ? 'animate-float' : ''}`}>
                  {item.icon}
                </div>

                {/* Name + desc */}
                <p className={`text-sm font-semibold text-center leading-tight mb-1 relative z-10 ${isLegendary ? 'animate-legendary-text' : 'text-white'}`}>
                  {item.name}
                </p>
                {effectSummary ? (
                  <p className="text-xs text-center mb-3 flex-1 relative z-10" style={{ color: rc.color }}>{effectSummary}</p>
                ) : (
                  <p className="text-gray-500 text-xs text-center leading-tight mb-3 flex-1 relative z-10">{item.description}</p>
                )}

                {/* Action button */}
                <div className="relative z-10">
                  {item.owned ? (
                    isMysteryBox ? (
                      <button
                        onClick={e => { e.stopPropagation(); openMysteryBox(item) }}
                        disabled={!!openingBoxId}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }}>
                        {openingBoxId === item.id ? '✨ Ouverture...' : '🎁 Ouvrir'}
                      </button>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); equip(item) }}
                        disabled={equipping === item.id}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: item.equipped
                            ? (item.is_consumable ? 'rgba(251,191,36,0.1)' : 'rgba(255,77,106,0.1)')
                            : 'rgba(37,194,146,0.1)',
                          border: `1px solid ${item.equipped ? (item.is_consumable ? 'rgba(251,191,36,0.3)' : 'rgba(255,77,106,0.3)') : 'rgba(37,194,146,0.3)'}`,
                          color: item.equipped ? (item.is_consumable ? '#FBBF24' : '#FF4D6A') : '#25C292',
                        }}>
                        {equipping === item.id ? '...' : item.equipped
                          ? (item.is_consumable ? 'Désactiver' : 'Déséquiper')
                          : (item.is_consumable ? '🔥 Activer' : 'Équiper')}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); purchase(item) }}
                      disabled={!canAfford || purchasing === item.id}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                      style={{
                        background: canAfford ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${canAfford ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: canAfford ? '#D4A843' : '#6B7280',
                      }}>
                      {purchasing === item.id ? '...' : `💰 ${item.cost_coins.toLocaleString()}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (() => {
        const rc = RC[preview.rarity]
        const bgKey = preview.effect?.background as string | undefined
        const bgPreview = bgKey ? BG_PREVIEW[bgKey] : null
        const effectSummary = getEffectSummary(preview)
        const isLegendary = preview.rarity === 'legendary'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setPreview(null)}>
            <div
              className={`w-full max-w-sm rounded-2xl p-6 relative overflow-hidden ${rc.cls}`}
              style={{
                background: bgPreview ? bgPreview.bg : '#111628',
                border: `1px solid ${rc.border}`,
                boxShadow: rc.glow,
              }}
              onClick={e => e.stopPropagation()}
            >
              {bgPreview && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-50">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className="absolute w-1 h-1 rounded-full"
                      style={{ background: bgPreview.stars, left: `${(i * 37 + 10) % 100}%`, top: `${(i * 53 + 5) % 100}%` }} />
                  ))}
                </div>
              )}

              <div className="relative z-10">
                <div className={`text-6xl text-center mb-4 ${isLegendary ? 'animate-float' : ''}`}>{preview.icon}</div>
                <div className="text-center mb-4">
                  <div className="flex justify-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: `${rc.color}20`, color: rc.color }}>
                      {rc.label}
                    </span>
                    {preview.is_consumable && !preview.effect?.mystery_box && (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-500/20 text-amber-400">
                        Consommable
                      </span>
                    )}
                  </div>
                  <h3 className={`font-cinzel text-xl font-bold mt-2 ${isLegendary ? 'animate-legendary-text' : 'text-white'}`}>
                    {preview.name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{preview.description}</p>
                  {effectSummary && (
                    <p className="text-sm mt-2 font-semibold" style={{ color: rc.color }}>{effectSummary}</p>
                  )}
                  {preview.effect?.mystery_box
                    ? <p className="text-xs text-[#D4A843]/70 mt-2">🎁 Ouvre la boîte pour obtenir une récompense aléatoire</p>
                    : preview.is_consumable && (
                      <p className="text-xs text-amber-400/70 mt-2">⚠️ Usage unique — consommé après la prochaine partie</p>
                    )
                  }
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setPreview(null)}
                    className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    Fermer
                  </button>
                  {preview.owned ? (
                    preview.effect?.mystery_box ? (
                      <button
                        onClick={() => openMysteryBox(preview)}
                        disabled={!!openingBoxId}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                        style={{ background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', color: '#D4A843' }}>
                        {openingBoxId === preview.id ? '✨ Ouverture...' : '🎁 Ouvrir la boîte'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { equip(preview); setPreview(null) }}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{
                          background: preview.equipped
                            ? (preview.is_consumable ? 'rgba(251,191,36,0.1)' : 'rgba(255,77,106,0.1)')
                            : 'rgba(37,194,146,0.15)',
                          border: `1px solid ${preview.equipped ? (preview.is_consumable ? 'rgba(251,191,36,0.3)' : 'rgba(255,77,106,0.3)') : 'rgba(37,194,146,0.3)'}`,
                          color: preview.equipped ? (preview.is_consumable ? '#FBBF24' : '#FF4D6A') : '#25C292',
                        }}>
                        {preview.equipped ? (preview.is_consumable ? 'Désactiver' : 'Déséquiper') : (preview.is_consumable ? '🔥 Activer' : 'Équiper')}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => purchase(preview)}
                      disabled={coins < preview.cost_coins || purchasing === preview.id}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                      style={{
                        background: coins >= preview.cost_coins ? 'linear-gradient(135deg, #D4A843, #D4A84399)' : 'rgba(255,255,255,0.05)',
                        color: coins >= preview.cost_coins ? '#080A12' : '#6B7280',
                      }}>
                      {purchasing === preview.id ? 'Achat...' : coins < preview.cost_coins ? `Insuffisant (${preview.cost_coins} 💰)` : `Acheter — ${preview.cost_coins} 💰`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Chest modal — shown after API response */}
      {chestReward && (
        <ChestModal
          reward={chestReward}
          onClose={() => setChestReward(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50 animate-slide-up"
          style={{
            background: toast.ok ? 'rgba(37,194,146,0.15)' : 'rgba(255,77,106,0.15)',
            border: `1px solid ${toast.ok ? 'rgba(37,194,146,0.3)' : 'rgba(255,77,106,0.3)'}`,
            color: toast.ok ? '#25C292' : '#FF4D6A',
          }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
