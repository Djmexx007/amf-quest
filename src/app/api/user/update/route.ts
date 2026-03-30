import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken, verifyPassword, hashPassword } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  let body: { full_name?: string; current_password?: string; new_password?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  // Update name
  if (body.full_name) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ full_name: body.full_name.trim() })
      .eq('id', payload.sub)
    if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Change password
  if (body.current_password && body.new_password) {
    if (body.new_password.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }
    const { data: user } = await supabaseAdmin.from('users').select('password_hash').eq('id', payload.sub).single()
    if (!user?.password_hash) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    const valid = await verifyPassword(body.current_password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 401 })

    const newHash = await hashPassword(body.new_password)
    const { error } = await supabaseAdmin.from('users').update({ password_hash: newHash }).eq('id', payload.sub)
    if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 })
}
