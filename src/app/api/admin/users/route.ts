import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || (payload.role !== 'moderator' && payload.role !== 'god')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 20
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''

  let query = supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, status, account_type, selected_branch_id, last_login_at, created_at, login_count', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, per_page: perPage })
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || (payload.role !== 'moderator' && payload.role !== 'god')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: { user_id: string; action: 'suspend' | 'unsuspend' | 'ban' | 'unban'; reason?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const updates: Record<string, unknown> = {}
  if (body.action === 'suspend') {
    updates.status = 'suspended'
    updates.suspension_reason = body.reason ?? null
  } else if (body.action === 'unsuspend') {
    updates.status = 'active'
    updates.suspension_reason = null
  } else if (body.action === 'ban') {
    updates.status = 'banned'
    updates.ban_reason = body.reason ?? null
  } else if (body.action === 'unban') {
    updates.status = 'active'
    updates.ban_reason = null
  } else {
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('users').update(updates).eq('id', body.user_id)
  if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
