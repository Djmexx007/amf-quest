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

// GET /api/god/inventory?user_id=...
export async function GET(request: NextRequest) {
  if (!requireGod(request)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id requis.' }, { status: 400 })

  const { data: inventory, error } = await supabaseAdmin
    .from('user_inventory')
    .select('id, item_id, branch_id, is_equipped, created_at, shop_items(name, icon, item_type, rarity, effect, is_consumable)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })

  return NextResponse.json({ inventory: inventory ?? [] })
}

// DELETE /api/god/inventory — remove item from user's inventory
export async function DELETE(request: NextRequest) {
  if (!requireGod(request)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: { inventory_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.inventory_id) return NextResponse.json({ error: 'inventory_id requis.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('user_inventory')
    .delete()
    .eq('id', body.inventory_id)

  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
