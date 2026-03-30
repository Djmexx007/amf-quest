import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', payload.sub)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: 'Erreur DB.' }, { status: 500 })

  const unread = (data ?? []).filter(n => !n.is_read).length

  return NextResponse.json({ notifications: data ?? [], unread })
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  let body: { id?: string; mark_all?: boolean }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (body.mark_all) {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', payload.sub)
      .eq('is_read', false)
  } else if (body.id) {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', payload.sub)
  }

  return NextResponse.json({ ok: true })
}
