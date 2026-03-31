import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(accessToken)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche non sélectionnée.' }, { status: 400 })
  }

  const { sub: userId, branch_id: branchId } = payload

  const today = new Date().toISOString().split('T')[0]
  const [characterRes, branchRes, missionsRes, recentSessionsRes, leaderboardCharsRes, achievementsRes, inventoryRes] = await Promise.all([
    supabaseAdmin.from('characters').select('*').eq('user_id', userId).eq('branch_id', branchId).single(),
    supabaseAdmin.from('branches').select('id, slug, name, color, icon, exam_provider').eq('id', branchId).single(),
    supabaseAdmin.from('daily_missions').select('*').eq('user_id', userId).eq('branch_id', branchId).eq('mission_date', today).order('completed'),
    supabaseAdmin.from('game_sessions').select('id, game_type, score, xp_earned, coins_earned, questions_correct, questions_total, completed_at').eq('user_id', userId).eq('branch_id', branchId).eq('completed', true).order('completed_at', { ascending: false }).limit(5),
    supabaseAdmin.from('characters').select('user_id, name, class_name, level, xp, streak_days').eq('branch_id', branchId).order('xp', { ascending: false }).limit(10),
    supabaseAdmin.from('user_achievements').select('achievement_id, unlocked_at, achievements(title, icon, rarity)').eq('user_id', userId).order('unlocked_at', { ascending: false }).limit(6),
    supabaseAdmin.from('user_inventory').select('item_id, is_equipped, shop_items(name, icon, item_type, rarity)').eq('user_id', userId).eq('branch_id', branchId).eq('is_equipped', true).limit(4),
  ])

  // If no character exists (shouldn't happen, but handle gracefully)
  if (!characterRes.data) {
    return NextResponse.json({ error: 'Personnage introuvable. Réessaie dans quelques secondes.' }, { status: 404 })
  }

  // Fetch user names + equipped titles for leaderboard
  const leaderboardChars = leaderboardCharsRes.data ?? []
  const userIds = leaderboardChars.map(c => c.user_id)

  const [{ data: leaderboardUsers }, { data: leaderboardTitles }] = await Promise.all([
    userIds.length > 0
      ? supabaseAdmin.from('users').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabaseAdmin
          .from('user_inventory')
          .select('user_id, shop_items!inner(item_type, effect)')
          .in('user_id', userIds)
          .eq('branch_id', branchId)
          .eq('is_equipped', true)
      : Promise.resolve({ data: [] }),
  ])

  const leaderboard = leaderboardChars.map(c => {
    const titleInv = (leaderboardTitles ?? []).find(
      t => t.user_id === c.user_id &&
        (t.shop_items as unknown as { item_type: string; effect: Record<string, unknown> }).item_type === 'title'
    )
    const titleEffect = titleInv
      ? (titleInv.shop_items as unknown as { item_type: string; effect: Record<string, unknown> }).effect
      : null
    return {
      ...c,
      full_name: leaderboardUsers?.find(u => u.id === c.user_id)?.full_name ?? 'Joueur',
      equipped_title: titleEffect?.title ? String(titleEffect.title) : null,
    }
  })

  return NextResponse.json({
    character: characterRes.data,
    branch: branchRes.data,
    missions: missionsRes.data ?? [],
    recent_sessions: recentSessionsRes.data ?? [],
    leaderboard,
    recent_achievements: achievementsRes.data ?? [],
    equipped_items: inventoryRes.data ?? [],
  })
}
