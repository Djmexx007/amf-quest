import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { checkRateLimit, rateLimitKey, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit'
import { calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'

function requireGod(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return null
  return payload
}

/**
 * POST /api/god/rewards
 *
 * body: {
 *   type: 'individual' | 'global' | 'branch'
 *   user_id?:  string          — required for 'individual'
 *   branch_id?: string         — optional; filters characters when given
 *   xp?:    number (0–100 000)
 *   coins?: number (0–100 000)
 *   item_id?: string           — shop item to add to inventory
 *   message?: string           — custom notification message
 * }
 */
export async function POST(request: NextRequest) {
  const godPayload = requireGod(request)
  if (!godPayload) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  // Rate limit
  const rlKey = rateLimitKey(request, godPayload.sub)
  const rl = checkRateLimit(rlKey, RATE_LIMITS.GOD_REWARDS)
  if (!rl.allowed) return tooManyRequests(rl.resetIn) as NextResponse

  let body: {
    type: 'individual' | 'global' | 'branch'
    user_id?: string
    branch_id?: string
    xp?: number
    coins?: number
    item_id?: string
    message?: string
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { type, user_id, branch_id, xp = 0, coins = 0, item_id, message } = body

  if (!['individual', 'global', 'branch'].includes(type)) {
    return NextResponse.json({ error: 'type invalide.' }, { status: 400 })
  }
  if (xp < 0 || xp > 100_000) return NextResponse.json({ error: 'XP invalide (0–100 000).' }, { status: 400 })
  if (coins < 0 || coins > 100_000) return NextResponse.json({ error: 'Coins invalides (0–100 000).' }, { status: 400 })
  if (xp === 0 && coins === 0 && !item_id) {
    return NextResponse.json({ error: 'Au moins xp, coins ou item_id doit être fourni.' }, { status: 400 })
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  let affected = 0

  // ── Individual ──────────────────────────────────────────────────────────────
  if (type === 'individual') {
    if (!user_id) return NextResponse.json({ error: 'user_id requis pour type individual.' }, { status: 400 })

    const { data: target } = await supabaseAdmin
      .from('users')
      .select('id, role, email')
      .eq('id', user_id)
      .single()
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    if (xp > 0 || coins > 0) {
      let q = supabaseAdmin.from('characters').select('id, xp, coins').eq('user_id', user_id)
      if (branch_id) q = q.eq('branch_id', branch_id)
      const { data: chars } = await q

      for (const char of chars ?? []) {
        const newXP = char.xp + xp
        const { level: newLevel, xpToNext } = calcLevelFromXP(newXP)
        const newClass = getCharacterClass(newLevel)
        await supabaseAdmin
          .from('characters')
          .update({ xp: newXP, coins: char.coins + coins, level: newLevel, xp_to_next_level: xpToNext, class_name: newClass })
          .eq('id', char.id)
        affected++
      }
    }

    // Add item to inventory
    if (item_id) {
      const { data: item } = await supabaseAdmin
        .from('shop_items')
        .select('id, name, is_consumable')
        .eq('id', item_id)
        .single()

      if (!item) {
        return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })
      }

      // Resolve branch: explicit > user.selected_branch_id > any character branch
      let effectiveBranchId: string | null = branch_id ?? (
        await supabaseAdmin.from('users').select('selected_branch_id').eq('id', user_id).single()
      ).data?.selected_branch_id ?? null

      if (!effectiveBranchId) {
        const { data: anyChar } = await supabaseAdmin
          .from('characters')
          .select('branch_id')
          .eq('user_id', user_id)
          .limit(1)
          .maybeSingle()
        effectiveBranchId = anyChar?.branch_id ?? null
      }

      if (!effectiveBranchId) {
        return NextResponse.json({ error: 'Impossible de déterminer la branche de cet utilisateur.' }, { status: 400 })
      }

      // For non-consumable items, skip if already owned
      if (!item.is_consumable) {
        const { data: existing } = await supabaseAdmin
          .from('user_inventory')
          .select('id')
          .eq('user_id', user_id)
          .eq('item_id', item_id)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({ error: 'Cet utilisateur possède déjà cet item.' }, { status: 409 })
        }
      }

      const { error: insertError } = await supabaseAdmin.from('user_inventory').insert({
        user_id,
        branch_id: effectiveBranchId,
        item_id,
        is_equipped: false,
      })
      if (insertError) {
        return NextResponse.json({ error: 'Erreur lors de l\'ajout à l\'inventaire.' }, { status: 500 })
      }
      affected++
    }

    // Notification
    const defaultMsg = [
      xp > 0 ? `+${xp} XP` : '',
      coins > 0 ? `+${coins} coins` : '',
      item_id ? '+ un item cadeau' : '',
    ].filter(Boolean).join(' et ')

    await supabaseAdmin.from('notifications').insert({
      user_id,
      type: 'admin',
      title: '🎁 Cadeau de l\'équipe AMF !',
      message: message ?? `Tu as reçu ${defaultMsg} de la part des dieux !`,
      is_read: false,
    })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: godPayload.sub,
      action: 'give_reward_individual',
      target_user_id: user_id,
      details: { xp, coins, item_id, branch_id, message },
      ip_address: ip,
    })
  }

  // ── Global or Branch ────────────────────────────────────────────────────────
  if (type === 'global' || type === 'branch') {
    if (type === 'branch' && !branch_id) {
      return NextResponse.json({ error: 'branch_id requis pour type branch.' }, { status: 400 })
    }

    if (xp > 0 || coins > 0) {
      let q = supabaseAdmin.from('characters').select('id, user_id, xp, coins')
      if (type === 'branch') q = q.eq('branch_id', branch_id!)
      const { data: chars } = await q

      // Batch update in chunks of 100
      const updates = (chars ?? []).map(c => {
        const newXP = c.xp + xp
        const { level: newLevel, xpToNext } = calcLevelFromXP(newXP)
        return { id: c.id, xp: newXP, coins: c.coins + coins, level: newLevel, xp_to_next_level: xpToNext, class_name: getCharacterClass(newLevel) }
      })

      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100)
        await Promise.all(chunk.map(u =>
          supabaseAdmin.from('characters').update({ xp: u.xp, coins: u.coins, level: u.level, xp_to_next_level: u.xp_to_next_level, class_name: u.class_name }).eq('id', u.id)
        ))
        affected += chunk.length
      }

      // Mass notification (batch insert)
      const userIds = [...new Set((chars ?? []).map(c => c.user_id))]
      const defaultMsg = [
        xp > 0 ? `+${xp} XP` : '',
        coins > 0 ? `+${coins} coins` : '',
      ].filter(Boolean).join(' et ')

      if (userIds.length > 0) {
        const notifTitle = type === 'global' ? '🌟 Événement spécial !' : '🎯 Récompense de branche !'
        await supabaseAdmin.from('notifications').insert(
          userIds.map(uid => ({
            user_id: uid,
            type: 'admin',
            title: notifTitle,
            message: message ?? `Tu reçois ${defaultMsg} de l'équipe AMF !`,
            is_read: false,
          }))
        )
      }
    }

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: godPayload.sub,
      action: `give_reward_${type}`,
      details: { xp, coins, branch_id, affected, message },
      ip_address: ip,
    })
  }

  return NextResponse.json({ ok: true, affected })
}
