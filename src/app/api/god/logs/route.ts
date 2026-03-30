import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 25

  const { data, count, error } = await supabaseAdmin
    .from('admin_logs')
    .select('id, action, details, ip_address, created_at, admin_id, target_user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (error) return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })

  // Fetch admin names
  const adminIds = [...new Set((data ?? []).map(l => l.admin_id).filter(Boolean))]
  const { data: admins } = adminIds.length > 0
    ? await supabaseAdmin.from('users').select('id, full_name').in('id', adminIds)
    : { data: [] }

  const adminMap = new Map((admins ?? []).map(u => [u.id, u.full_name]))

  const logs = (data ?? []).map(l => ({
    ...l,
    admin_name: adminMap.get(l.admin_id ?? '') ?? 'Système',
  }))

  return NextResponse.json({ logs, total: count ?? 0, page, per_page: perPage })
}

export async function POST(request: NextRequest) {
  // Write a log entry (called internally by other GOD actions)
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { action: string; target_user_id?: string; details?: Record<string, unknown> }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : null

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: body.action,
    target_user_id: body.target_user_id ?? null,
    details: body.details ?? {},
    ip_address: ip,
  })

  return NextResponse.json({ ok: true })
}
