// ─────────────────────────────────────────────────────────────────────────────
// In-process rate limiter (IP or user-keyed)
// Works in Node.js runtime. NOT suitable for Edge Runtime.
// For multi-instance deploys, swap store for a Redis/Upstash adapter.
// ─────────────────────────────────────────────────────────────────────────────

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Cleanup stale entries every 5 minutes to avoid memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  maxRequests: number  // allowed requests per window
  windowMs: number     // window length in ms
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number   // seconds until window resets
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.maxRequests - 1, resetIn: Math.ceil(opts.windowMs / 1000) }
  }

  if (entry.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, remaining: opts.maxRequests - entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) }
}

// Helper — extract best available key from a request
export function rateLimitKey(request: Request, userId?: string): string {
  const forwarded = (request.headers as Headers).get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0].trim() || 'unknown'
  return userId ? `user:${userId}` : `ip:${ip}`
}

// ── Preset limits ─────────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  GAME_COMPLETE:  { maxRequests: 30,  windowMs: 60_000    }, // 30 completions / min
  SHOP_PURCHASE:  { maxRequests: 10,  windowMs: 60_000    }, // 10 purchases / min
  SHOP_EQUIP:     { maxRequests: 30,  windowMs: 60_000    }, // 30 equips / min
  DAILY_REWARD:   { maxRequests: 3,   windowMs: 3_600_000 }, // 3 attempts / hour
  GOD_REWARDS:    { maxRequests: 20,  windowMs: 60_000    }, // 20 reward actions / min
  API_GENERAL:    { maxRequests: 120, windowMs: 60_000    }, // 120 req / min generic
} as const

export function tooManyRequests(resetIn: number) {
  return Response.json(
    { error: `Trop de requêtes. Réessayez dans ${resetIn} secondes.` },
    {
      status: 429,
      headers: {
        'Retry-After': String(resetIn),
        'X-RateLimit-Remaining': '0',
      },
    }
  )
}
