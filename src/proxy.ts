import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { canAccessAdminPanel, canAccessGodPanel } from '@/lib/permissions'

// ─────────────────────────────────────────────────────────────
// Config routes
// ─────────────────────────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/invite', '/setup-password', '/maintenance']
const ADMIN_PATHS = ['/admin']
const GOD_PATHS = ['/god']

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p))
}

function isGodPath(pathname: string): boolean {
  return GOD_PATHS.some(p => pathname.startsWith(p))
}

// ─────────────────────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────────────────────
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('X-XSS-Protection', '1; mode=block')

  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
  )

  return res
}

// ─────────────────────────────────────────────────────────────
// Maintenance mode (cached)
// ─────────────────────────────────────────────────────────────
let _maintenanceCache: { value: boolean; expires: number } | null = null

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()

  if (_maintenanceCache && _maintenanceCache.expires > now) {
    return _maintenanceCache.value
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_config?select=maintenance_mode&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
        },
      }
    )

    if (!res.ok) return false

    const data = await res.json()
    const value = data?.[0]?.maintenance_mode === true

    _maintenanceCache = { value, expires: now + 30_000 }

    return value
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────
// Main proxy
// ─────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignore static & Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // API routes → handled separately
  if (pathname.startsWith('/api/')) {
    return withSecurityHeaders(NextResponse.next())
  }

  // Public routes
  if (isPublicPath(pathname)) {
    return withSecurityHeaders(NextResponse.next())
  }

  // Root redirect
  if (pathname === '/') {
    const token = request.cookies.get('amf_access')?.value
    if (!token) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/login', request.url))
      )
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/login', request.url))
      )
    }

    return withSecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url))
    )
  }

  // ─────────────────────────
  // Auth required
  // ─────────────────────────
  const token = request.cookies.get('amf_access')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)

    return withSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  const payload = verifyAccessToken(token)

  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)

    return withSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // ─────────────────────────
  // Account status check
  // ─────────────────────────
  if (payload.status !== 'active') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('reason', payload.status)

    const response = NextResponse.redirect(loginUrl)

    response.cookies.delete('amf_access')
    response.cookies.delete('amf_refresh')

    return withSecurityHeaders(response)
  }

  // ─────────────────────────
  // Maintenance mode
  // ─────────────────────────
  if (payload.role !== 'god') {
    const maintenance = await getMaintenanceMode()

    if (maintenance) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL('/maintenance', request.url))
      )
    }
  }

  // ─────────────────────────
  // Role protection
  // ─────────────────────────
  if (isGodPath(pathname) && !canAccessGodPanel(payload.role)) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url))
    )
  }

  if (isAdminPath(pathname) && !canAccessAdminPanel(payload.role)) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url))
    )
  }

  // ─────────────────────────
  // Force branch selection
  // ─────────────────────────
  if (
    pathname !== '/select-branch' &&
    !isAdminPath(pathname) &&
    !isGodPath(pathname) &&
    !payload.branch_id
  ) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL('/select-branch', request.url))
    )
  }

  return withSecurityHeaders(NextResponse.next())
}

// ─────────────────────────────────────────────────────────────
// Matcher
// ─────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}