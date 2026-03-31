import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, signAccessToken, buildAccessCookie } from '@/lib/auth'

// Moderator/God can switch branches freely
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  // Regular users can switch only if they already have a character in the target branch
  const isAdmin = payload.role === 'moderator' || payload.role === 'god'

  let body: { branch_id?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const { branch_id } = body
  if (!branch_id) return NextResponse.json({ error: 'branch_id requis.' }, { status: 400 })

  const { data: branch, error } = await supabaseAdmin
    .from('branches')
    .select('id, name, color, icon')
    .eq('id', branch_id)
    .eq('is_active', true)
    .single()

  if (error || !branch) return NextResponse.json({ error: 'Branche introuvable.' }, { status: 404 })

  // Regular users may only switch to a branch where they already have a character
  if (!isAdmin) {
    const { data: userChar } = await supabaseAdmin
      .from('characters')
      .select('id')
      .eq('user_id', payload.sub)
      .eq('branch_id', branch_id)
      .maybeSingle()
    if (!userChar) {
      return NextResponse.json({ error: 'Accès non autorisé à cette branche.' }, { status: 403 })
    }
  }

  // Update user's selected branch
  await supabaseAdmin.from('users').update({ selected_branch_id: branch_id }).eq('id', payload.sub)

  // Create character for this branch if it doesn't exist
  const { data: existing } = await supabaseAdmin
    .from('characters')
    .select('id')
    .eq('user_id', payload.sub)
    .eq('branch_id', branch_id)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin.from('characters').insert({
      user_id: payload.sub,
      branch_id,
      name: payload.email.split('@')[0],
      class_name: 'Recrue',
    })
  }

  const newToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    branch_id,
    branch_locked: payload.branch_locked,
  })

  const response = NextResponse.json({ ok: true, branch })
  response.headers.append('Set-Cookie', buildAccessCookie(newToken))
  return response
}
