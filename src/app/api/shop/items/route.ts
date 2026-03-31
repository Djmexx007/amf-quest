import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type') // title|boost|avatar|cosmetic|null=all
  const rarity = request.nextUrl.searchParams.get('rarity')

  let query = supabaseAdmin
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('cost_coins')

  if (type) query = query.eq('item_type', type)
  if (rarity) query = query.eq('rarity', rarity)

  const { data: items, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })

  // Get user's inventory to mark owned items
  const branchId = payload.branch_id
  const { data: inventory } = branchId
    ? await supabaseAdmin
        .from('user_inventory')
        .select('item_id, is_equipped')
        .eq('user_id', payload.sub)
        .eq('branch_id', branchId)
    : { data: [] }

  const ownedMap = new Map((inventory ?? []).map(i => [i.item_id, i.is_equipped]))

  // Get character coins
  const { data: character } = branchId
    ? await supabaseAdmin
        .from('characters')
        .select('coins')
        .eq('user_id', payload.sub)
        .eq('branch_id', branchId)
        .single()
    : { data: null }

  const enriched = (items ?? [])
    // Hide chest-only items unless the player already owns them
    .filter(item => !(item.effect as Record<string, unknown>)?.chest_only || ownedMap.has(item.id))
    .map(item => ({
      ...item,
      owned: ownedMap.has(item.id),
      equipped: ownedMap.get(item.id) ?? false,
    }))

  return NextResponse.json({
    items: enriched,
    coins: character?.coins ?? 0,
  })
}
