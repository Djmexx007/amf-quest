import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, signAccessToken, buildAccessCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(accessToken)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  // Only users without a branch can select one (unless they're re-selecting as admin/god)
  if (payload.branch_id && payload.role === 'user') {
    return NextResponse.json({ error: 'Branche déjà verrouillée.' }, { status: 409 })
  }

  let body: { branch_id?: string; character_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { branch_id, character_name } = body
  if (!branch_id) return NextResponse.json({ error: 'branch_id requis.' }, { status: 400 })

  // Verify branch exists and is active
  const { data: branch, error: branchError } = await supabaseAdmin
    .from('branches')
    .select('id, name, color, icon')
    .eq('id', branch_id)
    .eq('is_active', true)
    .single()

  if (branchError || !branch) {
    return NextResponse.json({ error: 'Branche introuvable.' }, { status: 404 })
  }

  // Update user — lock the branch permanently
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      selected_branch_id: branch_id,
      branch_locked: true,
    })
    .eq('id', payload.sub)

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors de la sélection de branche.' }, { status: 500 })
  }

  // Create character for this branch
  const charName = character_name?.trim() || payload.email.split('@')[0]
  await supabaseAdmin.from('characters').insert({
    user_id: payload.sub,
    branch_id,
    name: charName,
    class_name: 'Recrue',
  })

  // Issue new access token with updated branch_id
  const newToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    branch_id,
    branch_locked: true,
  })

  const response = NextResponse.json({ ok: true, branch })
  response.headers.append('Set-Cookie', buildAccessCookie(newToken))
  return response
}
