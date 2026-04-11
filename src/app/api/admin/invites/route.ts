import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { canAccessAdminPanel } from '@/lib/permissions'
import { sendInvitationEmail } from '@/lib/email'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || !canAccessAdminPanel(payload.role)) return null
  return payload
}

// GET /api/admin/invites?status=all&page=1&limit=50
export async function GET(request: NextRequest) {
  const payload = requireAdmin(request)
  if (!payload) return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') ?? 'all'
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

  // Real stats from full table (not paginated)
  const { data: allStatuses } = await supabaseAdmin
    .from('invitations')
    .select('status')

  const statsRaw = allStatuses ?? []
  const stats = {
    total:     statsRaw.length,
    pending:   statsRaw.filter(i => i.status === 'pending').length,
    accepted:  statsRaw.filter(i => i.status === 'accepted').length,
    expired:   statsRaw.filter(i => i.status === 'expired').length,
    cancelled: statsRaw.filter(i => i.status === 'cancelled').length,
  }

  // Paginated invites
  let query = supabaseAdmin
    .from('invitations')
    .select('id, email, full_name, role, account_type, account_duration_days, status, expires_at, accepted_at, created_at, token, invited_by, suggested_branch_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status !== 'all') query = query.eq('status', status)

  const { data: invites, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch inviter names
  const inviterIds = [...new Set((invites ?? []).map(i => i.invited_by).filter(Boolean))]
  const { data: inviters } = inviterIds.length > 0
    ? await supabaseAdmin.from('users').select('id, full_name').in('id', inviterIds)
    : { data: [] }

  const inviterMap = new Map((inviters ?? []).map(u => [u.id, u.full_name]))

  const origin = new URL(request.url).origin
  const enriched = (invites ?? []).map(inv => ({
    ...inv,
    inviter_name: inv.invited_by ? (inviterMap.get(inv.invited_by) ?? 'Inconnu') : null,
    invite_url: `${origin}/invite/${inv.token}`,
  }))

  return NextResponse.json({
    invites: enriched,
    stats,
    total: count ?? 0,
    page,
    per_page: limit,
  })
}

// DELETE /api/admin/invites — cancel a pending invite
export async function DELETE(request: NextRequest) {
  const payload = requireAdmin(request)
  if (!payload) return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })

  let body: { id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', body.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'cancel_invite',
    details: { invite_id: body.id },
  })

  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/invites — resend email for a pending invite
export async function PATCH(request: NextRequest) {
  const payload = requireAdmin(request)
  if (!payload) return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })

  let body: { id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const { data: invite, error } = await supabaseAdmin
    .from('invitations')
    .select('id, token, email, full_name, role, status, invited_by')
    .eq('id', body.id)
    .single()

  if (error || !invite) return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Seules les invitations en attente peuvent être renvoyées.' }, { status: 400 })

  const origin = new URL(request.url).origin
  const inviteUrl = `${origin}/invite/${invite.token}`

  const { data: inviter } = await supabaseAdmin
    .from('users').select('full_name').eq('id', payload.sub).single()

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'Email non configuré (GMAIL_USER / GMAIL_APP_PASSWORD manquants).' }, { status: 503 })
  }

  try {
    await sendInvitationEmail({
      to: invite.email,
      fullName: invite.full_name ?? null,
      inviteUrl,
      role: invite.role,
      inviterName: inviter?.full_name ?? 'Un administrateur',
    })
  } catch (err) {
    return NextResponse.json({ error: `Échec d'envoi : ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'resend_invite',
    details: { invite_id: body.id, email: invite.email },
  })

  return NextResponse.json({ ok: true })
}
