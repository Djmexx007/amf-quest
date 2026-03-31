import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'

// Weighted reward pool for mystery boxes
const REWARD_POOL = [
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

function roll() {
  const total = REWARD_POOL.reduce((s, r) => s + r.weight, 0)
  let rand = Math.random() * total
  for (const r of REWARD_POOL) {
    rand -= r.weight
    if (rand <= 0) return r
  }
  return REWARD_POOL[0]
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

  // Fetch character
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('id, xp, coins, level')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  // Roll the reward
  const reward = roll()

  // Apply and consume
  const newXP    = character.xp + reward.xp
  const newCoins = character.coins + reward.coins
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
      title: '🎁 Boîte mystère ouverte !',
      message: `Tu as obtenu : ${reward.label}`,
      is_read: false,
    }),
  ])

  return NextResponse.json({
    ok: true,
    reward: {
      xp: reward.xp,
      coins: reward.coins,
      label: reward.label,
      tier: reward.tier,
    },
    level_up: levelUp,
    new_level: levelUp ? newLevel : undefined,
  })
}
