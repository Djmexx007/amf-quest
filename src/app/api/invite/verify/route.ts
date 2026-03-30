import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requis.' }, { status: 400 })

  const { data: invite, error } = await supabaseAdmin
    .from('invitations')
    .select('email, full_name, role, expires_at, status')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation déjà utilisée.' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expirée.' }, { status: 410 })
  }

  return NextResponse.json({
    email: invite.email,
    full_name: invite.full_name,
    role: invite.role,
    expires_at: invite.expires_at,
  })
}
