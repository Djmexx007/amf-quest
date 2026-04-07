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

// GET — fetch god's coin balance and character id
export async function GET(request: NextRequest) {
  const payload = requireGod(request)
  if (!payload) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { data: chars } = await supabaseAdmin
    .from('characters')
    .select('id, coins')
    .eq('user_id', payload.sub)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!chars?.length) return NextResponse.json({ coins: 0, character_id: null })
  return NextResponse.json({ coins: chars[0].coins, character_id: chars[0].id })
}

// POST — deduct bet or pay out winnings
export async function POST(request: NextRequest) {
  const payload = requireGod(request)
  if (!payload) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { action: 'deduct' | 'payout'; amount: number; character_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { action, amount, character_id } = body

  if (!character_id) return NextResponse.json({ error: 'character_id requis.' }, { status: 400 })
  if (typeof amount !== 'number' || amount <= 0 || amount > 10_000_000) {
    return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
  }
  if (action !== 'deduct' && action !== 'payout') {
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }

  // Verify the character belongs to this god
  const { data: char } = await supabaseAdmin
    .from('characters')
    .select('id, coins')
    .eq('id', character_id)
    .eq('user_id', payload.sub)
    .single()

  if (!char) return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })

  if (action === 'deduct') {
    if (char.coins < amount) return NextResponse.json({ error: 'Coins insuffisants.' }, { status: 400 })
    const newCoins = char.coins - amount
    const { error } = await supabaseAdmin.from('characters').update({ coins: newCoins }).eq('id', char.id)
    if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })
    return NextResponse.json({ ok: true, coins: newCoins })
  }

  // payout
  const newCoins = char.coins + amount
  const { error } = await supabaseAdmin.from('characters').update({ coins: newCoins }).eq('id', char.id)
  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })
  return NextResponse.json({ ok: true, coins: newCoins })
}
