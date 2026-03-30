import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

// User requests a branch change
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche introuvable.' }, { status: 400 })

  let body: { to_branch_id?: string; reason?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { to_branch_id, reason } = body
  if (!to_branch_id) return NextResponse.json({ error: 'to_branch_id requis.' }, { status: 400 })
  if (to_branch_id === payload.branch_id) return NextResponse.json({ error: 'Même branche.' }, { status: 400 })

  // Check target branch exists
  const { data: branch } = await supabaseAdmin.from('branches').select('id, name').eq('id', to_branch_id).eq('is_active', true).single()
  if (!branch) return NextResponse.json({ error: 'Branche introuvable.' }, { status: 404 })

  // Only one pending request at a time
  const { data: existing } = await supabaseAdmin
    .from('branch_change_requests')
    .select('id')
    .eq('user_id', payload.sub)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Tu as déjà une demande en attente.' }, { status: 409 })

  const { data, error } = await supabaseAdmin
    .from('branch_change_requests')
    .insert({
      user_id: payload.sub,
      from_branch_id: payload.branch_id,
      to_branch_id,
      reason: reason?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Erreur lors de la demande.' }, { status: 500 })

  return NextResponse.json({ ok: true, request_id: data.id })
}

// User can check their pending request
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('branch_change_requests')
    .select('id, status, reason, created_at, to_branch_id, branches!branch_change_requests_to_branch_id_fkey(name, color, icon)')
    .eq('user_id', payload.sub)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ request: data })
}
