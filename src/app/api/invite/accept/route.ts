import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword, isGodEmail } from '@/lib/auth'
import type { Invitation } from '@/types'

export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string; full_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { token, password, full_name } = body

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
    await supabaseAdmin
      .from('invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id)
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

  const passwordHash = await hashPassword(password)
  const displayName = full_name?.trim() || invite.full_name || invite.email.split('@')[0]

  // Calculate expiry for temporary accounts
  let expiresAt: string | null = null
  if (invite.account_type === 'temporary' && invite.account_duration_days) {
    const d = new Date()
    d.setDate(d.getDate() + invite.account_duration_days)
    expiresAt = d.toISOString()
  }

  const role = isGodEmail(invite.email) ? 'god' : invite.role

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
    })
    .select('id, email, full_name, role')
    .single()

  if (createError || !newUser) {
    console.error('User creation error:', createError)
    return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 })
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ user: newUser })
}
