import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search  = searchParams.get('search') ?? ''
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 20

  let query = supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, status, account_type, created_at, last_login_at, selected_branch_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, per_page: perPage })
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let body: { action: 'change_role' | 'reset_character'; user_id: string; role?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  if (!body.user_id) return NextResponse.json({ error: 'user_id requis.' }, { status: 400 })

  // Prevent self-modification
  if (body.user_id === payload.sub) {
    return NextResponse.json({ error: 'Impossible de modifier son propre compte.' }, { status: 400 })
  }

  if (body.action === 'change_role') {
    const validRoles = ['user', 'moderator', 'god']
    if (!body.role || !validRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ role: body.role })
      .eq('id', body.user_id)

    if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'change_role',
      target_user_id: body.user_id,
      details: { new_role: body.role },
    })

    return NextResponse.json({ ok: true })
  }

  if (body.action === 'reset_character') {
    // Fetch all characters for this user
    const { data: characters } = await supabaseAdmin
      .from('characters')
      .select('id')
      .eq('user_id', body.user_id)

    if (!characters?.length) {
      return NextResponse.json({ error: 'Aucun personnage trouvé.' }, { status: 404 })
    }

    const { level: resetLevel, xpToNext: resetXpToNext } = calcLevelFromXP(0)
    const resetClass = getCharacterClass(resetLevel)

    const { error } = await supabaseAdmin
      .from('characters')
      .update({
        xp: 0,
        coins: 0,
        level: resetLevel,
        xp_to_next_level: resetXpToNext,
        class_name: resetClass,
        login_streak: 0,
        streak_days: 0,
        last_daily_reward_date: null,
        total_games_played: 0,
        total_questions_answered: 0,
        total_correct_answers: 0,
      })
      .eq('user_id', body.user_id)

    if (error) return NextResponse.json({ error: 'Erreur lors de la réinitialisation.' }, { status: 500 })

    // Delete daily missions and game sessions history
    await Promise.all([
      supabaseAdmin.from('daily_missions').delete().eq('user_id', body.user_id),
      supabaseAdmin.from('user_achievements').delete().eq('user_id', body.user_id),
    ])

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'reset_character',
      target_user_id: body.user_id,
      details: { characters_reset: characters.length },
    })

    return NextResponse.json({ ok: true, characters_reset: characters.length })
  }

  return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
}
