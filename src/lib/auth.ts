import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { JWTPayload, RefreshTokenPayload, UserRole, UserStatus } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_TOKEN_TTL = 15 * 60          // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('Missing JWT secrets in environment variables')
}

// -------------------------------------------------------
// Password hashing
// -------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// -------------------------------------------------------
// Access token
// -------------------------------------------------------

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  })
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// -------------------------------------------------------
// Refresh token
// -------------------------------------------------------

export function signRefreshToken(userId: string, version: number = 0): string {
  const payload: RefreshTokenPayload = { sub: userId, version }
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  })
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload
  } catch {
    return null
  }
}

// -------------------------------------------------------
// Cookie helpers (used in Route Handlers)
// -------------------------------------------------------

export const ACCESS_COOKIE = 'amf_access'
export const REFRESH_COOKIE = 'amf_refresh'

export function buildAccessCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${ACCESS_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/${secure}; Max-Age=${ACCESS_TOKEN_TTL}`
}

export function buildRefreshCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${REFRESH_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/${secure}; Max-Age=${REFRESH_TOKEN_TTL}`
}

export function clearCookies(): string[] {
  return [
    `${ACCESS_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    `${REFRESH_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
  ]
}

// -------------------------------------------------------
// Character class resolver
// -------------------------------------------------------

export function getCharacterClass(level: number): string {
  if (level <= 5) return 'Recrue'
  if (level <= 10) return 'Analyste'
  if (level <= 15) return 'Conseiller'
  if (level <= 25) return 'Expert'
  if (level <= 35) return 'Maître'
  return 'Légende'
}

// -------------------------------------------------------
// Account status checks
// -------------------------------------------------------

export function isAccountAccessible(status: UserStatus): boolean {
  return status === 'active'
}

export function isGodEmail(email: string): boolean {
  return email.toLowerCase() === (process.env.GOD_EMAIL ?? '').toLowerCase()
}

export function resolveRoleForEmail(email: string, defaultRole: UserRole): UserRole {
  if (isGodEmail(email)) return 'god'
  return defaultRole
}
