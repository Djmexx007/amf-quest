import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  buildAccessCookie,
  buildRefreshCookie,
  isGodEmail,
} from '@/lib/auth'
import type { User } from '@/types'

// Rate limiting: in-memory store (replace with Redis in production)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>()

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
}

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key)
  if (!entry) return false
  if (entry.blockedUntil > Date.now()) return true
  if (entry.blockedUntil > 0 && entry.blockedUntil <= Date.now()) {
    loginAttempts.delete(key)
    return false
  }
  return false
}

function recordFailedAttempt(key: string): void {
  const entry = loginAttempts.get(key) ?? { count: 0, blockedUntil: 0 }
  entry.count += 1
  if (entry.count >= 5) {
    entry.blockedUntil = Date.now() + 15 * 60 * 1000 // 15 minutes
    entry.count = 0
  }
  loginAttempts.set(key, entry)
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key)
}

export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request)

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessaie dans 15 minutes.' },
      { status: 429 }
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Fetch user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .single<User>()

  if (error || !user || !user.password_hash) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
  }

  // Check status before verifying password (avoid leaking info via timing)
  if (user.status === 'banned') {
    return NextResponse.json(
      { error: 'Ce compte a été banni.', code: 'banned' },
      { status: 403 }
    )
  }
  if (user.status === 'suspended') {
    return NextResponse.json(
      { error: 'Ce compte est suspendu temporairement.', code: 'suspended' },
      { status: 403 }
    )
  }
  if (user.status === 'expired') {
    return NextResponse.json(
      { error: 'Ce compte temporaire a expiré.', code: 'expired' },
      { status: 403 }
    )
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 })
  }

  clearAttempts(ip)

  // Ensure GOD email always has god role
  const role = isGodEmail(normalizedEmail) ? 'god' : user.role

  // Update last login
  await supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString(), login_count: user.login_count + 1 })
    .eq('id', user.id)

  // Sign tokens
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role,
    status: user.status,
    branch_id: user.selected_branch_id,
    branch_locked: user.branch_locked,
  })
  const refreshToken = signRefreshToken(user.id)

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role,
      status: user.status,
      selected_branch_id: user.selected_branch_id,
      branch_locked: user.branch_locked,
    },
  })

  response.headers.append('Set-Cookie', buildAccessCookie(accessToken))
  response.headers.append('Set-Cookie', buildRefreshCookie(refreshToken))

  return response
}
