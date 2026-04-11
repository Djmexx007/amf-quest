import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { canCreateInvite } from '@/lib/permissions'
import { sendInvitationEmail } from '@/lib/email'
import type { UserRole } from '@/types'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(accessToken)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  if (!canCreateInvite(payload.role)) {
    return NextResponse.json({ error: 'Permission refusée.' }, { status: 403 })
  }

  let body: {
    email?: string
    full_name?: string
    role?: UserRole
    account_type?: string
    account_duration_days?: number
    suggested_branch_id?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
  }

  const { email, full_name, role = 'user', account_type = 'permanent', account_duration_days, suggested_branch_id } = body

  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  // Validate role
  if (!['user', 'moderator', 'god'].includes(role as string)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }
  // Only god can invite moderators or gods
  if ((role === 'moderator' || role === 'god') && payload.role !== 'god') {
    return NextResponse.json({ error: 'Seul le GOD peut inviter des modérateurs ou des dieux.' }, { status: 403 })
  }

  // Check if email already invited or has account
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'Un compte existe déjà pour cet email.' }, { status: 409 })
  }

  const { data: pendingInvite } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (pendingInvite) {
    return NextResponse.json({ error: 'Une invitation active existe déjà pour cet email.' }, { status: 409 })
  }

  const { data: invite, error } = await supabaseAdmin
    .from('invitations')
    .insert({
      email: email.toLowerCase().trim(),
      full_name: full_name?.trim(),
      invited_by: payload.sub,
      role,
      account_type,
      account_duration_days: account_type === 'temporary' ? account_duration_days : null,
      suggested_branch_id: suggested_branch_id || null,
    })
    .select('*')
    .single()

  if (error || !invite) {
    console.error('Invite creation error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'invitation.' }, { status: 500 })
  }

  // Log the action
  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'create_invite',
    details: { email, role, account_type, invite_id: invite.id },
    ip_address: request.headers.get('x-forwarded-for') ?? null,
  })

  const origin = new URL(request.url).origin
  const inviteUrl = `${origin}/invite/${invite.token}`

  // Fetch inviter name for the email
  const { data: inviter } = await supabaseAdmin
    .from('users').select('full_name').eq('id', payload.sub).single()

  // Send email (non-blocking — failure doesn't break the response)
  let emailError: string | null = null
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await sendInvitationEmail({
        to: invite.email,
        fullName: invite.full_name ?? null,
        inviteUrl,
        role: invite.role,
        inviterName: inviter?.full_name ?? 'Un administrateur',
      })
    } catch (err) {
      console.error('Email send failed:', err)
      emailError = err instanceof Error ? err.message : String(err)
    }
  } else {
    emailError = 'GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans les variables d\'environnement'
    console.error('Email not sent:', emailError)
  }

  return NextResponse.json({ invite, invite_url: inviteUrl, email_error: emailError })
}
