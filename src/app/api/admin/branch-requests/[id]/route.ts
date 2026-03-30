import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, signAccessToken, buildAccessCookie } from '@/lib/auth'
import { isAdmin } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isAdmin(payload.role)) return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 })

  const { id } = await params

  let body: { action: 'approve' | 'reject' }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { action } = body
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
  }

  // Fetch the request
  const { data: branchReq, error } = await supabaseAdmin
    .from('branch_change_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (error || !branchReq) return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })

  // Update status
  await supabaseAdmin
    .from('branch_change_requests')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: payload.sub, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (action === 'approve') {
    // Update user's branch
    await supabaseAdmin.from('users').update({ selected_branch_id: branchReq.to_branch_id }).eq('id', branchReq.user_id)

    // Create character for new branch if missing
    const { data: existing } = await supabaseAdmin
      .from('characters').select('id').eq('user_id', branchReq.user_id).eq('branch_id', branchReq.to_branch_id).maybeSingle()

    if (!existing) {
      const { data: user } = await supabaseAdmin.from('users').select('email').eq('id', branchReq.user_id).single()
      await supabaseAdmin.from('characters').insert({
        user_id: branchReq.user_id,
        branch_id: branchReq.to_branch_id,
        name: user?.email?.split('@')[0] ?? 'Joueur',
        class_name: 'Recrue',
      })
    }

    // Notify user
    await supabaseAdmin.from('notifications').insert({
      user_id: branchReq.user_id,
      title: 'Changement de branche approuvé',
      message: 'Ta demande de changement de branche a été approuvée. Reconnecte-toi pour accéder à ta nouvelle branche.',
      type: 'success',
      sent_by: payload.sub,
    })
  } else {
    await supabaseAdmin.from('notifications').insert({
      user_id: branchReq.user_id,
      title: 'Changement de branche refusé',
      message: 'Ta demande de changement de branche a été refusée par un administrateur.',
      type: 'warning',
      sent_by: payload.sub,
    })
  }

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: action === 'approve' ? 'branch_change_approved' : 'branch_change_rejected',
    target_user_id: branchReq.user_id,
    details: { request_id: id, to_branch_id: branchReq.to_branch_id },
  })

  return NextResponse.json({ ok: true })
}
