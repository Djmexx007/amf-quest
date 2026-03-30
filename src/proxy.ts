import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { canAccessAdminPanel, canAccessGodPanel } from '@/lib/permissions'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/invite', '/setup-password']

// Routes that require specific roles
const ADMIN_PATHS = ['/admin']
const GOD_PATHS = ['/god']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((p) => pathname.startsWith(p))
}

function isGodPath(pathname: string): boolean {
  return GOD_PATHS.some((p) => pathname.startsWith(p))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow API routes to handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Root redirect
  if (pathname === '/') {
    const accessToken = request.cookies.get('amf_access')?.value
    if (!accessToken || !verifyAccessToken(accessToken)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // All other routes require authentication
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = verifyAccessToken(accessToken)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check account status
  if (payload.status !== 'active') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('reason', payload.status)
    const response = NextResponse.redirect(loginUrl)
    // Clear cookies for non-active accounts
    response.cookies.delete('amf_access')
    response.cookies.delete('amf_refresh')
    return response
  }

  // GOD panel — only god
  if (isGodPath(pathname) && !canAccessGodPanel(payload.role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin panel — admin or god
  if (isAdminPath(pathname) && !canAccessAdminPanel(payload.role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Force branch selection for any authenticated user who hasn't chosen yet
  if (
    pathname !== '/select-branch' &&
    !isAdminPath(pathname) &&
    !isGodPath(pathname) &&
    !payload.branch_id
  ) {
    return NextResponse.redirect(new URL('/select-branch', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
