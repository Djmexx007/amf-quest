import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isAdmin, isModerator } from '@/lib/permissions'

// PATCH — approve / reject / update a question
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
  let body: { action?: 'approve' | 'reject' | 'toggle'; question_text?: string; explanation?: string; tip?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { action } = body

  // Approve / reject — admin+ only
  if (action === 'approve' || action === 'reject') {
    if (!isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Seul un admin/god peut approuver les questions.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('questions')
      .update({ is_active: action === 'approve' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: `question_${action}`,
      target_user_id: null,
      details: { question_id: id },
    })

    return NextResponse.json({ message: action === 'approve' ? 'Question approuvée.' : 'Question rejetée.' })
  }

  // Toggle active state
  if (action === 'toggle') {
    if (!isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }
    const { data: q } = await supabaseAdmin.from('questions').select('is_active').eq('id', id).single()
    if (!q) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 })

    const { error } = await supabaseAdmin.from('questions').update({ is_active: !q.is_active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ is_active: !q.is_active })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}

// DELETE — hard delete (admin+ only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isAdmin(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
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
