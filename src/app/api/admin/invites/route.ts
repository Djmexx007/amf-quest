import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { canAccessAdminPanel } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !canAccessAdminPanel(payload.role)) {
    return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get('status') // pending|accepted|expired|cancelled|all
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50')

  let query = supabaseAdmin
    .from('invitations')
    .select('id, email, full_name, role, account_type, account_duration_days, status, expires_at, accepted_at, created_at, token, invited_by, suggested_branch_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data: invites, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch inviter names
  const inviterIds = [...new Set((invites ?? []).map(i => i.invited_by).filter(Boolean))]
  const { data: inviters } = inviterIds.length > 0
    ? await supabaseAdmin.from('users').select('id, full_name').in('id', inviterIds)
    : { data: [] }

  const inviterMap = new Map((inviters ?? []).map(u => [u.id, u.full_name]))

  const enriched = (invites ?? []).map(inv => ({
    ...inv,
    inviter_name: inv.invited_by ? (inviterMap.get(inv.invited_by) ?? 'Inconnu') : null,
    invite_url: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inv.token}`,
  }))

  const stats = {
    total: enriched.length,
    pending: enriched.filter(i => i.status === 'pending').length,
    accepted: enriched.filter(i => i.status === 'accepted').length,
    expired: enriched.filter(i => i.status === 'expired').length,
  }

  return NextResponse.json({ invites: enriched, stats })
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !canAccessAdminPanel(payload.role)) {
    return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })
  }

  let body: { id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', body.id)
    .eq('status', 'pending') // only cancel pending ones

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'cancel_invite',
    details: { invite_id: body.id },
  })

  return NextResponse.json({ ok: true })
}
