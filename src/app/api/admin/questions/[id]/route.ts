import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod, isModerator } from '@/lib/permissions'

// PATCH — approve / reject / toggle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { id } = await params
  let body: { action?: 'approve' | 'reject' | 'toggle' }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { action } = body

  if (action === 'approve' || action === 'reject') {
    const isApprove = action === 'approve'
    const { error } = await supabaseAdmin
      .from('questions')
      .update({
        status:      isApprove ? 'approved' : 'rejected',
        is_active:   isApprove,
        approved_by: isApprove ? payload.sub : null,
        approved_at: isApprove ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: `question_${action}`,
      details: { question_id: id },
    })

    return NextResponse.json({ message: isApprove ? 'Question approuvée.' : 'Question rejetée.' })
  }

  if (action === 'toggle') {
    const { data: q } = await supabaseAdmin
      .from('questions')
      .select('is_active, status')
      .eq('id', id)
      .single()
    if (!q) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 })

    const nowActive = !q.is_active
    const { error } = await supabaseAdmin
      .from('questions')
      .update({
        is_active: nowActive,
        status: nowActive ? 'approved' : 'rejected',
        approved_by: nowActive ? payload.sub : null,
        approved_at: nowActive ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ is_active: nowActive })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Seul le GOD peut supprimer des questions.' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'delete_question',
    details: { question_id: id },
  })

  return NextResponse.json({ message: 'Question supprimée.' })
}
