import { NextRequest, NextResponse } from 'next/server'

// ── JWT decode (no crypto verify — route handlers do full verify) ──────────────
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded) as Record<string, unknown>
    // Respect expiry
    if (typeof parsed.exp === 'number' && parsed.exp * 1000 < Date.now()) return null
    return parsed
  } catch { return null }
}

// ── Maintenance mode cache ─────────────────────────────────────────────────────
let _maintenanceCache: { value: boolean; expires: number } | null = null

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  if (_maintenanceCache && _maintenanceCache.expires > now) return _maintenanceCache.value
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/game_config?select=maintenance_mode&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
      },
    })
    if (!res.ok) return false
    const data = (await res.json()) as Array<{ maintenance_mode?: boolean }>
    const value = Array.isArray(data) && data[0]?.maintenance_mode === true
    _maintenanceCache = { value, expires: now + 30_000 } // cache 30s
    return value
  } catch {
    return false
  }
}

// ── Security headers ───────────────────────────────────────────────────────────
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  // CSP — unsafe-inline/eval needed for Next.js runtime
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

function jsonForbidden(msg: string, status: 401 | 403 | 503) {
  return withSecurityHeaders(
    NextResponse.json({ error: msg }, { status })
  )
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return withSecurityHeaders(NextResponse.redirect(url))
}

// ── Main middleware ────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never touch Next.js internals or static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const isApiRoute    = pathname.startsWith('/api/')
  const isAuthRoute   = pathname.startsWith('/api/auth')
  const isGodApi      = pathname.startsWith('/api/god')
  const isAdminApi    = pathname.startsWith('/api/admin')
  const isGodPage     = pathname.startsWith('/god')
  const isAdminPage   = pathname.startsWith('/admin')
  const isPublicPage  = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/invite') || pathname === '/maintenance'

  // Auth routes: add headers, skip all other checks
  if (isAuthRoute) {
    return withSecurityHeaders(NextResponse.next())
  }

  // Parse JWT from cookie (no signature verify — just for routing)
  const token = request.cookies.get('amf_access')?.value
  const payload = token ? decodeJwt(token) : null
  const role   = typeof payload?.role === 'string' ? payload.role : null
  const status = typeof payload?.status === 'string' ? payload.status : null

  // Block suspended/banned/expired accounts everywhere except public pages
  if (!isPublicPage && payload && (status === 'banned' || status === 'suspended' || status === 'expired')) {
    if (isApiRoute) return jsonForbidden('Compte suspendu ou banni.', 403)
    return redirectTo(request, '/login')
  }

  // ── Maintenance mode ─────────────────────────────────────────
  // Gods always bypass; public pages + auth always pass through
  if (!isPublicPage && role !== 'god') {
    const maintenance = await getMaintenanceMode()
    if (maintenance) {
      if (isApiRoute) {
        return withSecurityHeaders(
          NextResponse.json(
            { error: 'Serveur en maintenance. Revenez bientôt.', maintenance: true },
            { status: 503 }
          )
        )
      }
      return redirectTo(request, '/maintenance')
    }
  }

  // ── God routes ───────────────────────────────────────────────
  if (isGodApi || isGodPage) {
    if (role !== 'god') {
      if (isApiRoute) return jsonForbidden('Accès refusé.', 403)
      return redirectTo(request, token ? '/dashboard' : '/login')
    }
  }

  // ── Admin routes ─────────────────────────────────────────────
  if (isAdminApi || isAdminPage) {
    if (role !== 'admin' && role !== 'god') {
      if (isApiRoute) return jsonForbidden('Accès refusé.', 403)
      return redirectTo(request, token ? '/dashboard' : '/login')
    }
  }

  // ── Authenticated-only routes ─────────────────────────────────
  if (!isPublicPage && !token) {
    if (isApiRoute) return jsonForbidden('Non authentifié.', 401)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return withSecurityHeaders(NextResponse.redirect(url))
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
