import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

function requireGod(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return null
  return payload
}

export async function GET(request: NextRequest) {
  if (!requireGod(request)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const mysteryOnly = request.nextUrl.searchParams.get('mystery_box') === 'true'

  let query = supabaseAdmin
    .from('shop_items')
    .select('id, name, icon, rarity, cost_coins, effect, is_active')
    .order('cost_coins')

  if (mysteryOnly) {
    query = query.filter('effect->>mystery_box', 'eq', 'true')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })

  return NextResponse.json({ items: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  if (!requireGod(request)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: { item_id: string; cost_coins?: number; is_active?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.item_id) return NextResponse.json({ error: 'item_id requis.' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.cost_coins === 'number') {
    if (body.cost_coins < 0) return NextResponse.json({ error: 'Prix invalide.' }, { status: 400 })
    updates.cost_coins = body.cost_coins
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('shop_items')
    .update(updates)
    .eq('id', body.item_id)

  if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
