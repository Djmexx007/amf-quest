import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  hashPassword,
  isGodEmail,
  signAccessToken,
  signRefreshToken,
  buildAccessCookie,
  buildRefreshCookie,
} from '@/lib/auth'
import type { Invitation } from '@/types'

export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string; full_name?: string; branch_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { token, password, full_name, branch_id } = body

  if (!token || !password) {
    return NextResponse.json({ error: 'Token et mot de passe requis.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
      { status: 400 }
    )
  }

  // Fetch invitation
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single<Invitation>()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: 'Cette invitation a déjà été utilisée ou annulée.' },
      { status: 410 }
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabaseAdmin.from('invitations').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Cette invitation a expiré.' }, { status: 410 })
  }

  // Check if email already has an account
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', invite.email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà pour cet email.' }, { status: 409 })
  }

  // Validate branch if provided
  let selectedBranchId: string | null = branch_id ?? invite.suggested_branch_id ?? null
  if (selectedBranchId) {
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', selectedBranchId)
      .eq('is_active', true)
      .single()
    if (!branch) selectedBranchId = null
  }

  const passwordHash = await hashPassword(password)
  const displayName = full_name?.trim() || invite.full_name || invite.email.split('@')[0]
  const role = isGodEmail(invite.email) ? 'god' : invite.role

  // Calculate account expiry for temporary accounts
  let expiresAt: string | null = null
  if (invite.account_type === 'temporary' && invite.account_duration_days) {
    const d = new Date()
    d.setDate(d.getDate() + invite.account_duration_days)
    expiresAt = d.toISOString()
  }

  // Create user
  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      email: invite.email,
      password_hash: passwordHash,
      full_name: displayName,
      role,
      status: 'active',
      account_type: invite.account_type,
      expires_at: expiresAt,
      invited_by: invite.invited_by,
      selected_branch_id: selectedBranchId,
      branch_locked: !!selectedBranchId,
    })
    .select('id, email, full_name, role, status, selected_branch_id, branch_locked')
    .single()

  if (createError || !newUser) {
    console.error('User creation error:', createError)
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  // Create character for the selected branch
  if (selectedBranchId) {
    await supabaseAdmin.from('characters').insert({
      user_id: newUser.id,
      branch_id: selectedBranchId,
      xp: 0,
      level: 1,
      xp_to_next_level: 100,
      class_name: 'Recrue',
      coins: 100,
      total_games_played: 0,
      total_questions_answered: 0,
      total_correct_answers: 0,
      streak_days: 0,
    })
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Sign tokens so the user is immediately logged in
  const accessToken = signAccessToken({
    sub: newUser.id,
    email: newUser.email,
    role: newUser.role,
    status: 'active',
    branch_id: selectedBranchId,
    branch_locked: newUser.branch_locked ?? false,
  })
  const refreshToken = signRefreshToken(newUser.id)

  const response = NextResponse.json({ user: newUser })
  response.headers.append('Set-Cookie', buildAccessCookie(accessToken))
  response.headers.append('Set-Cookie', buildRefreshCookie(refreshToken))
  return response
}
