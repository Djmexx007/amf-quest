import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { checkRateLimit, rateLimitKey, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })
  }

  // Rate limit: prevent purchase spam (10/min per user)
  const rl = checkRateLimit(rateLimitKey(request, payload.sub), RATE_LIMITS.SHOP_PURCHASE)
  if (!rl.allowed) return tooManyRequests(rl.resetIn) as NextResponse

  let body: { item_id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { item_id } = body
  if (!item_id) return NextResponse.json({ error: 'item_id requis.' }, { status: 400 })

  // Fetch item
  const { data: item } = await supabaseAdmin
    .from('shop_items')
    .select('id, name, cost_coins, item_type, rarity, effect, is_consumable')
    .eq('id', item_id)
    .eq('is_active', true)
    .single()

  if (!item) return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })

  // Consumables can be repurchased; permanents cannot
  if (!item.is_consumable) {
    const { data: existing } = await supabaseAdmin
      .from('user_inventory')
      .select('id')
      .eq('user_id', payload.sub)
      .eq('item_id', item_id)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Item déjà possédé.' }, { status: 409 })
  }

  // Check coins
  const { data: character } = await supabaseAdmin
    .from('characters')
    .select('id, coins')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (!character) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })
  if (character.coins < item.cost_coins) {
    return NextResponse.json({ error: 'Coins insuffisants.', required: item.cost_coins, current: character.coins }, { status: 402 })
  }

  // Deduct coins
  await supabaseAdmin
    .from('characters')
    .update({ coins: character.coins - item.cost_coins })
    .eq('id', character.id)

  // Add to inventory
  await supabaseAdmin.from('user_inventory').insert({
    user_id: payload.sub,
    branch_id: payload.branch_id,
    item_id,
    is_equipped: false,
  })

  // Check shop achievement
  await checkShopAchievement(payload.sub, payload.branch_id)

  return NextResponse.json({
    ok: true,
    coins_remaining: character.coins - item.cost_coins,
    item: { id: item.id, name: item.name, rarity: item.rarity, effect: item.effect },
  })
}

async function checkShopAchievement(userId: string, branchId: string) {
  const { count } = await supabaseAdmin
    .from('user_inventory')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count === 1) {
    // First purchase achievement
    const { data: ach } = await supabaseAdmin
      .from('achievements')
      .select('id, xp_reward, coin_reward')
      .eq('slug', 'shop_first')
      .maybeSingle()

    if (ach) {
      const { data: existing } = await supabaseAdmin
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', ach.id)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from('user_achievements').insert({ user_id: userId, branch_id: branchId, achievement_id: ach.id })
        await supabaseAdmin.rpc('increment_character_rewards', { p_user_id: userId, p_branch_id: branchId, p_xp: ach.xp_reward, p_coins: ach.coin_reward })
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: '🏆 Succès débloqué !',
          message: `Tu as débloqué "Premier Achat" — +${ach.xp_reward} XP, +${ach.coin_reward} coins`,
          type: 'success',
        })
      }
    }
  }
}
