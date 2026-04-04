import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod } from '@/lib/permissions'

// PATCH — update a category (god only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut modifier les catégories.' }, { status: 403 })
  }

  const { id } = await params
  let body: { name?: string; icon?: string; color?: string; order_index?: number; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)        updates.name        = body.name.trim()
  if (body.icon !== undefined)        updates.icon        = body.icon
  if (body.color !== undefined)       updates.color       = body.color
  if (body.order_index !== undefined) updates.order_index = body.order_index
  if (body.is_active !== undefined)   updates.is_active   = body.is_active

  const { data, error } = await supabaseAdmin
    .from('question_categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

// DELETE — hard delete (god only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut supprimer des catégories.' }, { status: 403 })
  }

  const { id } = await params
  // Soft-delete: deactivate instead of removing (preserves FK integrity on questions)
  const { error } = await supabaseAdmin
    .from('question_categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Catégorie désactivée.' })
}
