import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { checkRateLimit, rateLimitKey, RATE_LIMITS, tooManyRequests } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  // Rate limit: 5 bug reports per hour per user
  const rl = checkRateLimit(rateLimitKey(request, payload.sub), RATE_LIMITS.DAILY_REWARD)
  if (!rl.allowed) return tooManyRequests(rl.resetIn) as NextResponse

  let body: { message?: string; page?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const message = body.message?.trim()
  if (!message || message.length < 5) {
    return NextResponse.json({ error: 'Message trop court.' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message trop long (max 2000 caractères).' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('bug_reports').insert({
    user_id: payload.sub,
    message,
    page: body.page ?? null,
    status: 'new',
  })

  if (error) return NextResponse.json({ error: 'Erreur lors de l\'envoi.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
