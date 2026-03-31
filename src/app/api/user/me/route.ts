import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, isGodEmail, signAccessToken, buildAccessCookie } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(accessToken)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, status, selected_branch_id, branch_locked')
    .eq('id', payload.sub)
    .single()

  if (error || !user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

  const role = isGodEmail(user.email) ? 'god' : user.role
  const responseUser = { ...user, role }

  // If the DB role differs from the token role, silently reissue the access token
  // so that subsequent API calls (which check payload.role) reflect the new role.
  if (role !== payload.role || user.selected_branch_id !== payload.branch_id) {
    const newToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role,
      status: user.status,
      branch_id: user.selected_branch_id,
      branch_locked: user.branch_locked,
    })
    const response = NextResponse.json({ user: responseUser })
    response.headers.append('Set-Cookie', buildAccessCookie(newToken))
    return response
  }

  return NextResponse.json({ user: responseUser })
}
