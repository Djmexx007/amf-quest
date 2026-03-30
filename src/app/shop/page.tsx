'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Zap, Image, Sparkles, Crown, Filter } from 'lucide-react'

interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  item_type: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  cost_coins: number
  effect: Record<string, unknown>
  owned: boolean
  equipped: boolean
}

const RARITY_CONFIG = {
  common:    { label: 'Commun',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)', glow: '' },
  rare:      { label: 'Rare',      color: '#4D8BFF', bg: 'rgba(77,139,255,0.1)',  border: 'rgba(77,139,255,0.2)',  glow: '0 0 16px rgba(77,139,255,0.15)' },
  epic:      { label: 'Épique',    color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', glow: '0 0 20px rgba(167,139,250,0.2)' },
  legendary: { label: 'Légendaire',color: '#D4A843', bg: 'rgba(212,168,67,0.1)',  border: 'rgba(212,168,67,0.25)', glow: '0 0 28px rgba(212,168,67,0.25)' },
}

const TYPE_CONFIG = {
  all:      { label: 'Tout',    icon: <ShoppingBag size={16} /> },
  boost:    { label: 'Boosts', icon: <Zap size={16} /> },
  title:    { label: 'Titres', icon: <Crown size={16} /> },
  avatar:   { label: 'Avatars',icon: <Image size={16} /> },
  cosmetic: { label: 'Divers', icon: <Sparkles size={16} /> },
}

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [preview, setPreview] = useState<ShopItem | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (rarityFilter !== 'all') params.set('rarity', rarityFilter)

    const res = await fetch(`/api/shop/items?${params}`)
    const data = await res.json()
    setItems(data.items ?? [])
    setCoins(data.coins ?? 0)
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [typeFilter, rarityFilter])

  async function purchase(item: ShopItem) {
    if (item.owned || purchasing) return
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
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: true } : i))
        showToast(`✨ "${item.name}" acheté !`, true)
        setPreview(null)
      } else {
        showToast(data.error ?? 'Erreur lors de l\'achat.', false)
      }
    } finally {
      setPurchasing(null)
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
        setItems(prev => prev.map(i => {
          if (i.item_type === item.item_type && i.id !== item.id) return { ...i, equipped: false }
          if (i.id === item.id) return { ...i, equipped: newEquip }
          return i
        }))
        showToast(newEquip ? `"${item.name}" équipé !` : `"${item.name}" déséquipé.`, true)
      }
    } finally {
      setEquipping(null)
    }
  }

  const filteredItems = items

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShoppingBag size={28} className="text-[#D4A843]" />
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-white">Boutique</h1>
            <p className="text-gray-500 text-sm">Dépense tes coins pour des avantages exclusifs</p>
          </div>
        </div>
        <div className="rpg-card px-5 py-3 flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-cinzel text-xl font-bold text-[#D4A843]">{coins.toLocaleString()}</span>
          <span className="text-gray-500 text-sm">coins</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Type filter */}
        <div className="flex gap-2">
          {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: typeFilter === key ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${typeFilter === key ? '#D4A843' : 'rgba(255,255,255,0.08)'}`,
                color: typeFilter === key ? '#D4A843' : '#6B7280',
              }}
            >
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>

        {/* Rarity filter */}
        <div className="flex gap-2 ml-auto">
          <Filter size={16} className="text-gray-600 self-center" />
          {['all', 'common', 'rare', 'epic', 'legendary'].map(r => {
            const conf = r === 'all' ? { label: 'Tout', color: '#6B7280' } : RARITY_CONFIG[r as keyof typeof RARITY_CONFIG]
            return (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: rarityFilter === r ? `${conf.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${rarityFilter === r ? conf.color : 'rgba(255,255,255,0.08)'}`,
                  color: rarityFilter === r ? conf.color : '#6B7280',
                }}
              >
                {r === 'all' ? 'Tout' : (conf as typeof RARITY_CONFIG[keyof typeof RARITY_CONFIG]).label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rpg-card h-52 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rpg-card p-12 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500">Aucun item dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => {
            const rc = RARITY_CONFIG[item.rarity]
            const canAfford = coins >= item.cost_coins
            return (
              <div
                key={item.id}
                onClick={() => setPreview(item)}
                className="rpg-card p-4 flex flex-col cursor-pointer transition-all duration-200 hover:scale-[1.02] relative overflow-hidden"
                style={{
                  border: `1px solid ${item.owned ? rc.border : 'rgba(255,255,255,0.06)'}`,
                  background: item.owned ? rc.bg : '#0D1221',
                  boxShadow: item.owned ? rc.glow : '',
                }}
              >
                {/* Rarity badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: `${rc.color}20`, color: rc.color, border: `1px solid ${rc.color}30` }}>
                    {rc.label}
                  </span>
                </div>

                {/* Owned / equipped badge */}
                {item.equipped && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-green-500/20 text-green-400 border border-green-500/30">Équipé</span>
                  </div>
                )}

                {/* Icon */}
                <div className="text-4xl text-center mt-4 mb-3">{item.icon}</div>

                {/* Name */}
                <p className="text-white text-sm font-semibold text-center leading-tight mb-1">{item.name}</p>
                <p className="text-gray-500 text-xs text-center leading-tight mb-3 flex-1">{item.description}</p>

                {/* Price / owned */}
                {item.owned ? (
                  <button
                    onClick={e => { e.stopPropagation(); equip(item) }}
                    disabled={equipping === item.id}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: item.equipped ? 'rgba(255,77,106,0.1)' : 'rgba(37,194,146,0.1)',
                      border: `1px solid ${item.equipped ? 'rgba(255,77,106,0.3)' : 'rgba(37,194,146,0.3)'}`,
                      color: item.equipped ? '#FF4D6A' : '#25C292',
                    }}
                  >
                    {equipping === item.id ? '...' : item.equipped ? 'Déséquiper' : 'Équiper'}
                  </button>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); purchase(item) }}
                    disabled={!canAfford || purchasing === item.id}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: canAfford ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${canAfford ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      color: canAfford ? '#D4A843' : '#6B7280',
                    }}
                  >
                    {purchasing === item.id ? '...' : `💰 ${item.cost_coins}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setPreview(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111628', border: `1px solid ${RARITY_CONFIG[preview.rarity].border}`, boxShadow: RARITY_CONFIG[preview.rarity].glow }}
            onClick={e => e.stopPropagation()}>
            <div className="text-6xl text-center mb-4">{preview.icon}</div>
            <div className="text-center mb-4">
              <span className="text-xs px-2 py-1 rounded-full font-semibold mb-2 inline-block"
                style={{ background: `${RARITY_CONFIG[preview.rarity].color}20`, color: RARITY_CONFIG[preview.rarity].color }}>
                {RARITY_CONFIG[preview.rarity].label} · {preview.item_type}
              </span>
              <h3 className="font-cinzel text-xl font-bold text-white mt-2">{preview.name}</h3>
              <p className="text-gray-400 text-sm mt-1">{preview.description}</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 transition-all hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                Fermer
              </button>
              {preview.owned ? (
                <button
                  onClick={() => { equip(preview); setPreview(null) }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: preview.equipped ? 'rgba(255,77,106,0.1)' : 'rgba(37,194,146,0.15)',
                    border: `1px solid ${preview.equipped ? 'rgba(255,77,106,0.3)' : 'rgba(37,194,146,0.3)'}`,
                    color: preview.equipped ? '#FF4D6A' : '#25C292',
                  }}>
                  {preview.equipped ? 'Déséquiper' : 'Équiper'}
                </button>
              ) : (
                <button
                  onClick={() => purchase(preview)}
                  disabled={coins < preview.cost_coins || purchasing === preview.id}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: coins >= preview.cost_coins ? `linear-gradient(135deg, #D4A843, #D4A84399)` : 'rgba(255,255,255,0.05)',
                    color: coins >= preview.cost_coins ? '#080A12' : '#6B7280',
                  }}>
                  {purchasing === preview.id ? 'Achat...' : coins < preview.cost_coins ? `Insuffisant (${preview.cost_coins} 💰)` : `Acheter — ${preview.cost_coins} 💰`}
                </button>
              )}
            </div>
          </div>
        </div>
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
