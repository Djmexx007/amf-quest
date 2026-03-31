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

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    usersRes, pendingRes, activeRes,
    suspendedRes, bannedRes, expiredRes,
    sessionsTodayRes, newThisWeekRes,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true })
      .eq('status', 'pending').gt('expires_at', new Date().toISOString()),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'banned'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabaseAdmin.from('game_sessions').select('id', { count: 'exact', head: true })
      .gte('started_at', todayStart.toISOString()),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
  ])

  return NextResponse.json({
    stats: {
      users:          usersRes.count          ?? 0,
      pending:        pendingRes.count        ?? 0,
      active:         activeRes.count         ?? 0,
      suspended:      suspendedRes.count      ?? 0,
      banned:         bannedRes.count         ?? 0,
      expired:        expiredRes.count        ?? 0,
      sessions_today: sessionsTodayRes.count  ?? 0,
      new_this_week:  newThisWeekRes.count    ?? 0,
    },
  })
}
