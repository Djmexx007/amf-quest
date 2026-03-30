import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  buildAccessCookie,
  buildRefreshCookie,
  clearCookies,
  isGodEmail,
} from '@/lib/auth'
import type { User } from '@/types'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('amf_refresh')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token.' }, { status: 401 })
  }

  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    const res = NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 })
    for (const c of clearCookies()) res.headers.append('Set-Cookie', c)
    return res
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.sub)
    .single<User>()

  if (error || !user || user.status !== 'active') {
    const res = NextResponse.json({ error: 'Account not accessible.' }, { status: 401 })
    for (const c of clearCookies()) res.headers.append('Set-Cookie', c)
    return res
  }

  const role = isGodEmail(user.email) ? 'god' : user.role

  const newAccessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role,
    status: user.status,
    branch_id: user.selected_branch_id,
    branch_locked: user.branch_locked,
  })
  const newRefreshToken = signRefreshToken(user.id)

  const response = NextResponse.json({ ok: true })
  response.headers.append('Set-Cookie', buildAccessCookie(newAccessToken))
  response.headers.append('Set-Cookie', buildRefreshCookie(newRefreshToken))
  return response
}
