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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [recentRes, topPlayersRes, weekSessionsRes, moduleSessionsRes] = await Promise.all([
    supabaseAdmin
      .from('game_sessions')
      .select('id, game_type, score, xp_earned, questions_total, questions_correct, started_at, users!game_sessions_user_id_fkey(full_name), modules(title)')
      .order('started_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('characters')
      .select('xp, level, class_name, users!characters_user_id_fkey(full_name)')
      .order('xp', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('game_sessions')
      .select('started_at')
      .gte('started_at', sevenDaysAgo),
    supabaseAdmin
      .from('game_sessions')
      .select('module_id, modules(title)')
      .not('module_id', 'is', null)
      .gte('started_at', sevenDaysAgo),
  ])

  // Build daily counts for last 7 days
  const dailyCounts: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyCounts[d.toISOString().slice(0, 10)] = 0
  }
  for (const s of weekSessionsRes.data ?? []) {
    const day = (s.started_at as string).slice(0, 10)
    if (day in dailyCounts) dailyCounts[day]++
  }

  // Aggregate module play counts
  const moduleCounts: Record<string, { title: string; count: number }> = {}
  for (const s of moduleSessionsRes.data ?? []) {
    const mid = s.module_id as string
    const title = (s.modules as { title?: string } | null)?.title ?? 'Inconnu'
    if (!moduleCounts[mid]) moduleCounts[mid] = { title, count: 0 }
    moduleCounts[mid].count++
  }
  const top_modules = Object.values(moduleCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return NextResponse.json({
    recent_sessions: recentRes.data ?? [],
    top_players:     topPlayersRes.data ?? [],
    daily_sessions:  Object.entries(dailyCounts).map(([date, count]) => ({ date, count })),
    top_modules,
  })
}
