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

// GET — all branches (including inactive)
export async function GET(request: NextRequest) {
  if (!requireGod(request)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .order('order_index')
  if (error) return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  return NextResponse.json({ branches: data ?? [] })
}

// POST — create branch
export async function POST(request: NextRequest) {
  const payload = requireGod(request)
  if (!payload) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: {
    slug: string; name: string; description?: string
    color: string; icon: string; exam_provider?: string
    unlock_level?: number; order_index?: number
  }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.slug || !body.name || !body.color || !body.icon) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert({
      slug: body.slug.toLowerCase().trim(),
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      color: body.color,
      icon: body.icon.trim(),
      exam_provider: body.exam_provider?.trim() ?? null,
      unlock_level: body.unlock_level ?? 1,
      order_index: body.order_index ?? 99,
      is_active: true,
      created_by: payload.sub,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ce slug est déjà utilisé.' }, { status: 409 })
    return NextResponse.json({ error: 'Erreur lors de la création.' }, { status: 500 })
  }

  return NextResponse.json({ branch: data })
}

// PATCH — update branch (toggle active, edit fields)
export async function PATCH(request: NextRequest) {
  if (!requireGod(request)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { id: string; [key: string]: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 })

  const { id, ...updates } = body
  const { error } = await supabaseAdmin.from('branches').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
