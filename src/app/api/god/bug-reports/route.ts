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

export async function GET(request: NextRequest) {
  if (!requireGod(request)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // new | in_progress | resolved | null=all
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const per    = 20

  let query = supabaseAdmin
    .from('bug_reports')
    .select('id, message, page, status, created_at, users!bug_reports_user_id_fkey(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * per, page * per - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })

  return NextResponse.json({ reports: data ?? [], total: count ?? 0, page, per_page: per })
}

export async function PATCH(request: NextRequest) {
  if (!requireGod(request)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { id?: string; action?: 'set_status' | 'delete'; status?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  if (body.action === 'delete') {
    await supabaseAdmin.from('bug_reports').delete().eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'set_status') {
    const valid = ['new', 'in_progress', 'resolved']
    if (!body.status || !valid.includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('bug_reports')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
}
