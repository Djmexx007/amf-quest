import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod, isModerator } from '@/lib/permissions'

// GET — list categories (moderator+ can read, to populate form selects)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const gameType = searchParams.get('game_type')

  let query = supabaseAdmin
    .from('question_categories')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  if (gameType) {
    query = query.eq('game_type', gameType)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ categories: data ?? [] })
}

// POST — create a category (god only)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut créer des catégories.' }, { status: 403 })
  }

  let body: { game_type: string; name: string; icon?: string; color?: string; order_index?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { game_type, name, icon, color, order_index } = body
  if (!game_type || !name?.trim()) {
    return NextResponse.json({ error: 'game_type et name sont requis.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('question_categories')
    .insert({ game_type, name: name.trim(), icon: icon ?? null, color: color ?? '#D4A843', order_index: order_index ?? 0 })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data }, { status: 201 })
}
