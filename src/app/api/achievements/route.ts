import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  // All achievements
  const { data: all } = await supabaseAdmin
    .from('achievements')
    .select('id, slug, title, description, icon, condition_type, condition_value, xp_reward, coin_reward, rarity')
    .order('rarity')

  // User's unlocked
  const { data: unlocked } = await supabaseAdmin
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', payload.sub)

  const unlockedMap = new Map((unlocked ?? []).map(u => [u.achievement_id, u.unlocked_at]))

  const enriched = (all ?? []).map(ach => ({
    ...ach,
    unlocked: unlockedMap.has(ach.id),
    unlocked_at: unlockedMap.get(ach.id) ?? null,
  }))

  const stats = {
    total: enriched.length,
    unlocked: enriched.filter(a => a.unlocked).length,
    by_rarity: {
      common:    { total: enriched.filter(a => a.rarity === 'common').length,    unlocked: enriched.filter(a => a.rarity === 'common' && a.unlocked).length },
      rare:      { total: enriched.filter(a => a.rarity === 'rare').length,      unlocked: enriched.filter(a => a.rarity === 'rare' && a.unlocked).length },
      epic:      { total: enriched.filter(a => a.rarity === 'epic').length,      unlocked: enriched.filter(a => a.rarity === 'epic' && a.unlocked).length },
      legendary: { total: enriched.filter(a => a.rarity === 'legendary').length, unlocked: enriched.filter(a => a.rarity === 'legendary' && a.unlocked).length },
    },
  }

  return NextResponse.json({ achievements: enriched, stats })
}
