import { NextResponse } from 'next/server'
import { clearCookies } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  for (const cookie of clearCookies()) {
    response.headers.append('Set-Cookie', cookie)
  }
  return response
}
