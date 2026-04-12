import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, signAccessToken, buildAccessCookie } from '@/lib/auth'
import { isModerator } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 })

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'

  const { data, error } = await supabaseAdmin
    .from('branch_change_requests')
    .select(`
      id, status, reason, created_at, reviewed_at,
      user_id,
      from_branch:branches!from_branch_id(id, name, color, icon),
      to_branch:branches!to_branch_id(id, name, color, icon)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ requests: [], total: 0 })

  // Fetch user names
  const userIds = [...new Set((data ?? []).map(r => r.user_id))]
  const { data: users } = userIds.length > 0
    ? await supabaseAdmin.from('users').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const enriched = (data ?? []).map(r => ({
    ...r,
    user: users?.find(u => u.id === r.user_id) ?? { full_name: 'Inconnu', email: '' },
  }))

  return NextResponse.json({ requests: enriched, total: enriched.length })
}
