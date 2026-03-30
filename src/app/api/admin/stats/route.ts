import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { canAccessAdminPanel } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !canAccessAdminPanel(payload.role)) {
    return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })
  }

  const [usersRes, pendingRes, activeRes] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('status', 'pending').gt('expires_at', new Date().toISOString()),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  return NextResponse.json({
    stats: {
      users: usersRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      active: activeRes.count ?? 0,
    },
  })
}
