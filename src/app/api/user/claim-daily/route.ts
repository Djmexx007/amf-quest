import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { checkRateLimit, rateLimitKey, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit'

// Daily reward tiers based on login streak
// streak 1 = day 1, 7 = weekly milestone
const DAILY_REWARDS: Record<number, { xp: number; coins: number; label: string }> = {
  1: { xp: 50,  coins: 30,  label: 'Jour 1' },
  2: { xp: 75,  coins: 45,  label: 'Jour 2' },
  3: { xp: 100, coins: 60,  label: 'Jour 3' },
  4: { xp: 125, coins: 75,  label: 'Jour 4' },
  5: { xp: 150, coins: 90,  label: 'Jour 5' },
  6: { xp: 175, coins: 100, label: 'Jour 6' },
  7: { xp: 300, coins: 200, label: '🏆 Semaine complète !' },
}

function getRewardForStreak(streak: number) {
  const day = ((streak - 1) % 7) + 1 // Cycle 1–7
  return DAILY_REWARDS[day] ?? DAILY_REWARDS[1]
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })
  }

  // Rate limit: max 3 claim attempts per hour per user (prevents spam)
  const rl = checkRateLimit(rateLimitKey(request, payload.sub), RATE_LIMITS.DAILY_REWARD)
  if (!rl.allowed) return tooManyRequests(rl.resetIn) as NextResponse

  const today = new Date().toISOString().split('T')[0]

  const { data: character, error } = await supabaseAdmin
    .from('characters')
    .select('id, xp, coins, login_streak, last_daily_reward_date')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (error || !character) {
    return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })
  }

  // Already claimed today on this branch
  if (character.last_daily_reward_date === today) {
    return NextResponse.json({
      already_claimed: true,
      message: 'Récompense déjà réclamée aujourd\'hui.',
      next_claim_at: `${today}T24:00:00Z`,
    })
  }

  // Cross-branch check: prevent double-claiming after a branch switch/change
  const { count: claimedElsewhere } = await supabaseAdmin
    .from('characters')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', payload.sub)
    .eq('last_daily_reward_date', today)
    .neq('branch_id', payload.branch_id)

  if (claimedElsewhere && claimedElsewhere > 0) {
    // Sync this character so future checks are instant
    await supabaseAdmin
      .from('characters')
      .update({ last_daily_reward_date: today })
      .eq('id', character.id)
    return NextResponse.json({
      already_claimed: true,
      message: 'Récompense déjà réclamée aujourd\'hui.',
      next_claim_at: `${today}T24:00:00Z`,
    })
  }

  // Calculate new streak
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  const lastClaim = character.last_daily_reward_date as string | null
  const currentStreak: number = character.login_streak ?? 0

  const newStreak = lastClaim === yesterday
    ? currentStreak + 1  // consecutive day
    : 1                  // streak broken or first time

  const reward = getRewardForStreak(newStreak)

  // Apply reward
  await supabaseAdmin
    .from('characters')
    .update({
      xp: character.xp + reward.xp,
      coins: character.coins + reward.coins,
      login_streak: newStreak,
      last_daily_reward_date: today,
    })
    .eq('id', character.id)

  // Notify
  await supabaseAdmin.from('notifications').insert({
    user_id: payload.sub,
    type: 'info',
    title: `📅 Récompense quotidienne — ${reward.label}`,
    message: `+${reward.xp} XP et +${reward.coins} coins ! Streak: ${newStreak} jour${newStreak > 1 ? 's' : ''} 🔥`,
    is_read: false,
  })

  return NextResponse.json({
    ok: true,
    xp_earned: reward.xp,
    coins_earned: reward.coins,
    streak: newStreak,
    label: reward.label,
    streak_broken: lastClaim !== null && lastClaim !== yesterday,
  })
}
