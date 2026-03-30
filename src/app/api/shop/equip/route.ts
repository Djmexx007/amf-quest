import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })

  let body: { item_id?: string; equip?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { item_id, equip = true } = body
  if (!item_id) return NextResponse.json({ error: 'item_id requis.' }, { status: 400 })

  // Verify ownership
  const { data: inv } = await supabaseAdmin
    .from('user_inventory')
    .select('id, item_id')
    .eq('user_id', payload.sub)
    .eq('item_id', item_id)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'Item non possédé.' }, { status: 403 })

  // Get item type to unequip others of same type
  const { data: item } = await supabaseAdmin
    .from('shop_items')
    .select('item_type')
    .eq('id', item_id)
    .single()

  if (!item) return NextResponse.json({ error: 'Item introuvable.' }, { status: 404 })

  // Unequip all items of same type first
  if (equip) {
    const { data: sameType } = await supabaseAdmin
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', payload.sub)
      .eq('is_equipped', true)

    if (sameType && sameType.length > 0) {
      const sameTypeIds = sameType.map(i => i.item_id)
      const { data: sameTypeItems } = await supabaseAdmin
        .from('shop_items')
        .select('id, item_type')
        .in('id', sameTypeIds)
        .eq('item_type', item.item_type)

      if (sameTypeItems && sameTypeItems.length > 0) {
        await supabaseAdmin
          .from('user_inventory')
          .update({ is_equipped: false })
          .eq('user_id', payload.sub)
          .in('item_id', sameTypeItems.map(i => i.id))
      }
    }
  }

  // Equip/unequip the item
  await supabaseAdmin
    .from('user_inventory')
    .update({ is_equipped: equip })
    .eq('user_id', payload.sub)
    .eq('item_id', item_id)

  return NextResponse.json({ ok: true, equipped: equip })
}
