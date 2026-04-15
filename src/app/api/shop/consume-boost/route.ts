import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

// Called when a consumable boost is used in-game (e.g., dungeon_revive)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })

  let body: { effect_key: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { effect_key } = body

  // Find equipped consumable boost with this effect key
  const { data: inventory } = await supabaseAdmin
    .from('user_inventory')
    .select('id, shop_items!inner(effect, is_consumable)')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .eq('is_equipped', true)

  const target = (inventory ?? []).find(inv => {
    const raw = inv.shop_items
    const item = (Array.isArray(raw) ? raw[0] : raw) as { effect: Record<string, unknown>; is_consumable: boolean } | null
    return !!item?.is_consumable && !!item.effect?.[effect_key]
  })

  if (!target) return NextResponse.json({ ok: false, message: 'Boost introuvable.' })

  // Delete the consumed item from inventory
  await supabaseAdmin.from('user_inventory').delete().eq('id', target.id)

  return NextResponse.json({ ok: true })
}
