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

// Fallback pool (original)
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

function roll(pool: RewardEntry[]): RewardEntry {
  const total = pool.reduce((s, r) => s + r.weight, 0)
  let rand = Math.random() * total
  for (const r of pool) {
    rand -= r.weight
    if (rand <= 0) return r
  }
  return pool[0]
}

// Rarity selection weights by chest tier for exclusive item grants
const ITEM_RARITY_WEIGHTS = {
  elite:     { rare: 65, epic: 30, legendary: 5  },
  legendary: { rare: 20, epic: 45, legendary: 35 },
}

function rollItemRarity(chestTier: 'elite' | 'legendary'): string {
  const w = ITEM_RARITY_WEIGHTS[chestTier]
  const rand = Math.random() * 100
  if (rand < w.legendary) return 'legendary'
  if (rand < w.legendary + w.epic) return 'epic'
  return 'rare'
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

  // Verify ownership and that this is actually a mystery box
  const [{ data: inv }, { data: item }] = await Promise.all([
    supabaseAdmin
      .from('user_inventory')
      .select('id')
      .eq('user_id', payload.sub)
      .eq('item_id', body.item_id)
      .maybeSingle(),
    supabaseAdmin
      .from('shop_items')
      .select('effect')
      .eq('id', body.item_id)
      .single(),
  ])

  if (!inv) return NextResponse.json({ error: 'Item non possédé.' }, { status: 403 })
  if (!item || !(item.effect as Record<string, unknown>)?.mystery_box) {
    return NextResponse.json({ error: 'Cet item n\'est pas une boîte mystère.' }, { status: 400 })
  }

  const effect = item.effect as Record<string, unknown>
  const chestTier = (effect.chest_tier as string) ?? 'novice'

  // Fetch character
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('id, xp, coins, level')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  // Try to grant a chest-exclusive item (elite: 25%, legendary: 50%)
  const itemGrantChance = chestTier === 'legendary' ? 0.50 : chestTier === 'elite' ? 0.25 : 0
  let itemReward: { id: string; name: string; icon: string; rarity: string } | null = null

  if (itemGrantChance > 0 && Math.random() < itemGrantChance) {
    const itemRarity = rollItemRarity(chestTier as 'elite' | 'legendary')

    const { data: exclusiveItems } = await supabaseAdmin
      .from('shop_items')
      .select('id, name, icon, rarity')
      .filter('effect->>chest_only', 'eq', 'true')
      .eq('rarity', itemRarity)
      .eq('is_active', true)

    if (exclusiveItems && exclusiveItems.length > 0) {
      // Filter out items the user already owns
      const { data: owned } = await supabaseAdmin
        .from('user_inventory')
        .select('item_id')
        .eq('user_id', payload.sub)
        .in('item_id', exclusiveItems.map(i => i.id))

      const ownedIds = new Set((owned ?? []).map(o => o.item_id))
      const available = exclusiveItems.filter(i => !ownedIds.has(i.id))

      if (available.length > 0) {
        itemReward = available[Math.floor(Math.random() * available.length)]
        await supabaseAdmin.from('user_inventory').insert({
          user_id: payload.sub,
          item_id: itemReward.id,
          branch_id: payload.branch_id,
          is_equipped: false,
        })
      }
    }
  }

  // Roll XP/coins reward (always rolled — if item was granted, XP/coins are reduced)
  const pool = CHEST_POOLS[chestTier] ?? DEFAULT_POOL
  const reward = roll(pool)

  // If item was granted, skip the XP/coins (item IS the reward)
  const finalXP    = itemReward ? 0 : reward.xp
  const finalCoins = itemReward ? 0 : reward.coins
  const finalLabel = itemReward
    ? `🎁 "${itemReward.name}" obtenu !`
    : reward.label
  const finalTier  = itemReward ? itemReward.rarity : reward.tier

  // Apply XP/coins
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
      xp: finalXP,
      coins: finalCoins,
      label: finalLabel,
      tier: finalTier,
      item: itemReward ?? undefined,
    },
    level_up: levelUp,
    new_level: levelUp ? newLevel : undefined,
  })
}
