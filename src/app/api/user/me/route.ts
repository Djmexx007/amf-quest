import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, isGodEmail } from '@/lib/auth'

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

  return NextResponse.json({ user: { ...user, role } })
}
