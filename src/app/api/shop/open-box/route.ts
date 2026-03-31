import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'

type RewardEntry = { weight: number; xp: number; coins: number; label: string; tier: string }

// Reward pools per chest tier
const CHEST_POOLS: Record<string, RewardEntry[]> = {
  novice: [
    { weight: 35, xp: 150,  coins: 0,   label: '✨ +150 XP',               tier: 'common' },
    { weight: 28, xp: 0,    coins: 200, label: '🪙 +200 Coins',             tier: 'common' },
    { weight: 20, xp: 200,  coins: 50,  label: '✨ +200 XP & +50 Coins',    tier: 'common' },
    { weight: 10, xp: 400,  coins: 150, label: '💎 +400 XP & +150 Coins',   tier: 'rare'   },
    { weight: 5,  xp: 0,    coins: 500, label: '🪙 +500 Coins',             tier: 'rare'   },
    { weight: 1.5,xp: 700,  coins: 250, label: '🌟 +700 XP & +250 Coins !', tier: 'epic'   },
    { weight: 0.5,xp: 1200, coins: 300, label: '🏆 +1 200 XP & +300 Coins !!', tier: 'legendary' },
  ],
  elite: [
    { weight: 20, xp: 300,  coins: 100,  label: '✨ +300 XP & +100 Coins',        tier: 'common'    },
    { weight: 15, xp: 0,    coins: 450,  label: '🪙 +450 Coins',                  tier: 'common'    },
    { weight: 25, xp: 600,  coins: 200,  label: '💎 +600 XP & +200 Coins',        tier: 'rare'      },
    { weight: 20, xp: 0,    coins: 750,  label: '🪙 +750 Coins',                  tier: 'rare'      },
    { weight: 12, xp: 900,  coins: 300,  label: '🌟 +900 XP & +300 Coins !',      tier: 'epic'      },
    { weight: 5,  xp: 1600, coins: 0,    label: '💫 +1 600 XP !',                 tier: 'epic'      },
    { weight: 3,  xp: 1200, coins: 700,  label: '⚡ +1 200 XP & +700 Coins !!',  tier: 'legendary' },
  ],
  legendary: [
    { weight: 10, xp: 500,  coins: 200,  label: '✨ +500 XP & +200 Coins',           tier: 'rare'      },
    { weight: 10, xp: 0,    coins: 900,  label: '🪙 +900 Coins',                     tier: 'rare'      },
    { weight: 25, xp: 1100, coins: 400,  label: '🌟 +1 100 XP & +400 Coins !',       tier: 'epic'      },
    { weight: 20, xp: 1800, coins: 0,    label: '💫 +1 800 XP !',                    tier: 'epic'      },
    { weight: 15, xp: 1000, coins: 900,  label: '⚡ +1 000 XP & +900 Coins !!',     tier: 'legendary' },
    { weight: 15, xp: 2200, coins: 600,  label: '🏆 +2 200 XP & +600 Coins !!',     tier: 'legendary' },
    { weight: 5,  xp: 3500, coins: 1200, label: '👑 JACKPOT +3 500 XP & +1 200 Coins !!!', tier: 'legendary' },
  ],
}

const DEFAULT_POOL: RewardEntry[] = [
  { weight: 28, xp: 100,  coins: 0,   label: '✨ +100 XP',                    tier: 'common'    },
  { weight: 22, xp: 200,  coins: 0,   label: '✨ +200 XP',                    tier: 'common'    },
  { weight: 18, xp: 0,    coins: 150, label: '🪙 +150 Coins',                  tier: 'common'    },
  { weight: 14, xp: 250,  coins: 100, label: '🎉 +250 XP & +100 Coins',        tier: 'rare'      },
  { weight: 10, xp: 0,    coins: 350, label: '🪙 +350 Coins',                  tier: 'rare'      },
  { weight: 5,  xp: 500,  coins: 200, label: '🌟 +500 XP & +200 Coins !',      tier: 'epic'      },
  { weight: 2,  xp: 1000, coins: 0,   label: '💫 +1 000 XP !!',               tier: 'epic'      },
  { weight: 0.8,xp: 800,  coins: 400, label: '⚡ +800 XP & +400 Coins !!',    tier: 'legendary' },
  { weight: 0.2,xp: 2000, coins: 500, label: '🏆 JACKPOT +2 000 XP & +500 Coins !!!', tier: 'legendary' },
]

// Chest cost (for coins compensation on duplicate/all-owned)
const CHEST_COST: Record<string, number> = {
  novice:    500,
  elite:     1500,
  legendary: 4000,
}

// Item grant chance per chest tier (0 = never, updated probabilities)
const ITEM_GRANT_CHANCE: Record<string, number> = {
  novice:    0,     // never grants exclusive items
  elite:     0.10,  // 10%
  legendary: 0.30,  // 30%
}

// Pity thresholds
const PITY_ITEM_THRESHOLD      = 10   // guaranteed item after 10 chests without one
const PITY_LEGENDARY_THRESHOLD = 30   // guaranteed legendary item after 30 elite/legendary chests

// Rarity weights for exclusive item selection
const ITEM_RARITY_WEIGHTS = {
  elite:     { rare: 60, epic: 30, legendary: 10 },
  legendary: { rare: 0,  epic: 60, legendary: 40 },
}

function roll(pool: RewardEntry[]): RewardEntry {
  const total = pool.reduce((s, r) => s + r.weight, 0)
  let rand = Math.random() * total
  for (const r of pool) {
    rand -= r.weight
    if (rand <= 0) return r
  }
  return pool[0]
}

function rollItemRarity(chestTier: 'elite' | 'legendary'): string {
  const w = ITEM_RARITY_WEIGHTS[chestTier]
  const rand = Math.random() * 100
  if (rand < w.legendary) return 'legendary'
  if (rand < w.legendary + w.epic) return 'epic'
  return 'rare'
}

async function getPity(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_chest_pity')
    .select('pity_item, pity_legendary')
    .eq('user_id', userId)
    .maybeSingle()
  return { pityItem: data?.pity_item ?? 0, pityLegendary: data?.pity_legendary ?? 0 }
}

async function updatePity(userId: string, pityItem: number, pityLegendary: number) {
  await supabaseAdmin
    .from('user_chest_pity')
    .upsert({ user_id: userId, pity_item: pityItem, pity_legendary: pityLegendary, updated_at: new Date().toISOString() })
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })
  }

  let body: { item_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.item_id) return NextResponse.json({ error: 'item_id requis.' }, { status: 400 })

  // Verify ownership and that this is a mystery box
  const [{ data: inv }, { data: item }] = await Promise.all([
    supabaseAdmin.from('user_inventory').select('id').eq('user_id', payload.sub).eq('item_id', body.item_id).maybeSingle(),
    supabaseAdmin.from('shop_items').select('effect').eq('id', body.item_id).single(),
  ])

  if (!inv) return NextResponse.json({ error: 'Item non possédé.' }, { status: 403 })
  if (!item || !(item.effect as Record<string, unknown>)?.mystery_box) {
    return NextResponse.json({ error: 'Cet item n\'est pas une boîte mystère.' }, { status: 400 })
  }

  const effect    = item.effect as Record<string, unknown>
  const chestTier = (effect.chest_tier as string) ?? 'novice'

  // Fetch character
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('id, xp, coins, level')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  // ── Pity system ───────────────────────────────────────────────
  const { pityItem, pityLegendary } = await getPity(payload.sub)
  const isEliteOrLegendary = chestTier === 'elite' || chestTier === 'legendary'

  // Determine if item should be granted
  const legendaryPityTriggered = isEliteOrLegendary && pityLegendary >= PITY_LEGENDARY_THRESHOLD
  const itemPityTriggered      = pityItem >= PITY_ITEM_THRESHOLD
  const normalItemChance       = ITEM_GRANT_CHANCE[chestTier] ?? 0
  const shouldGrantItem        = legendaryPityTriggered
    || itemPityTriggered
    || (normalItemChance > 0 && Math.random() < normalItemChance)

  // ── Exclusive item logic ──────────────────────────────────────
  let itemReward: { id: string; name: string; icon: string; rarity: string } | null = null
  let coinsCompensation = 0

  if (shouldGrantItem && chestTier !== 'novice') {
    // Determine rarity target
    let targetRarity: string
    if (legendaryPityTriggered) {
      targetRarity = 'legendary'
    } else {
      targetRarity = rollItemRarity(chestTier as 'elite' | 'legendary')
    }

    // Fetch all exclusive items of this rarity
    const { data: exclusiveItems } = await supabaseAdmin
      .from('shop_items')
      .select('id, name, icon, rarity')
      .filter('effect->>chest_only', 'eq', 'true')
      .eq('rarity', targetRarity)
      .eq('is_active', true)

    if (exclusiveItems && exclusiveItems.length > 0) {
      // Filter to items the user doesn't own yet
      const { data: owned } = await supabaseAdmin
        .from('user_inventory')
        .select('item_id')
        .eq('user_id', payload.sub)
        .in('item_id', exclusiveItems.map(i => i.id))

      const ownedIds  = new Set((owned ?? []).map(o => o.item_id))
      const available = exclusiveItems.filter(i => !ownedIds.has(i.id))

      if (available.length > 0) {
        // Grant a random unowned exclusive item
        itemReward = available[Math.floor(Math.random() * available.length)]
        await supabaseAdmin.from('user_inventory').insert({
          user_id:    payload.sub,
          item_id:    itemReward.id,
          branch_id:  payload.branch_id,
          is_equipped: false,
        })
      } else {
        // All exclusives of this rarity already owned → coins compensation
        coinsCompensation = Math.round((CHEST_COST[chestTier] ?? 500) * 0.5)
      }
    }

    // Reset pity counters
    const newPityItem      = 0 // reset whenever we attempted a grant
    const newPityLegendary = targetRarity === 'legendary' ? 0 : (isEliteOrLegendary ? pityLegendary + 1 : pityLegendary)
    await updatePity(payload.sub, newPityItem, newPityLegendary)
  } else {
    // No item granted — increment pity counters
    const newPityItem      = pityItem + 1
    const newPityLegendary = isEliteOrLegendary ? pityLegendary + 1 : pityLegendary
    await updatePity(payload.sub, newPityItem, newPityLegendary)
  }

  // ── XP / Coins reward (always rolled) ────────────────────────
  const pool       = CHEST_POOLS[chestTier] ?? DEFAULT_POOL
  const xpReward   = roll(pool)

  // If exclusive item was granted or compensation given, replace the reward label
  const finalXP    = (itemReward || coinsCompensation > 0) ? 0 : xpReward.xp
  const finalCoins = itemReward ? 0 : (coinsCompensation > 0 ? coinsCompensation : xpReward.coins)
  const finalLabel = itemReward
    ? `🎁 "${itemReward.name}" obtenu !`
    : coinsCompensation > 0
      ? `🪙 Compensation doublons : +${coinsCompensation} Coins`
      : xpReward.label
  const finalTier  = itemReward
    ? itemReward.rarity
    : coinsCompensation > 0 ? 'rare' : xpReward.tier

  // Apply to character
  const newXP    = character.xp + finalXP
  const newCoins = character.coins + finalCoins
  const { level: newLevel, xpToNext } = calcLevelFromXP(newXP)
  const newClass = getCharacterClass(newLevel)
  const levelUp  = newLevel > character.level

  await Promise.all([
    supabaseAdmin.from('characters').update({
      xp: newXP, coins: newCoins,
      level: newLevel, xp_to_next_level: xpToNext, class_name: newClass,
    }).eq('id', character.id),
    // Consume the box
    supabaseAdmin.from('user_inventory').delete().eq('id', inv.id),
    // Notify
    supabaseAdmin.from('notifications').insert({
      user_id: payload.sub,
      type: 'success',
      title: '🎁 Coffre ouvert !',
      message: `Tu as obtenu : ${finalLabel}`,
      is_read: false,
    }),
  ])

  return NextResponse.json({
    ok: true,
    reward: {
      xp:     finalXP,
      coins:  finalCoins,
      label:  finalLabel,
      tier:   finalTier,
      item:   itemReward ?? undefined,
      pity_progress: {
        item:      Math.min(pityItem + 1, PITY_ITEM_THRESHOLD),
        item_max:  PITY_ITEM_THRESHOLD,
        legendary: isEliteOrLegendary ? Math.min(pityLegendary + 1, PITY_LEGENDARY_THRESHOLD) : pityLegendary,
        legendary_max: PITY_LEGENDARY_THRESHOLD,
      },
    },
    level_up: levelUp,
    new_level: levelUp ? newLevel : undefined,
  })
}
