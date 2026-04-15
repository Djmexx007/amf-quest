import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod, isModerator } from '@/lib/permissions'

// GET — liste des catégories (moderator+, filtrable par branche)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const branch = searchParams.get('branch')

  let query = supabaseAdmin
    .from('question_categories')
    .select('id, branch, name, icon, color, created_at')
    .order('name')

  if (branch) query = query.eq('branch', branch)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ categories: data ?? [] })
}

// POST — créer une catégorie (god only)
export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut créer des catégories.' }, { status: 403 })
  }

  let body: { branch: string; name: string; icon?: string; color?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { branch, name, icon, color } = body
  if (!branch?.trim() || !name?.trim()) {
    return NextResponse.json({ error: 'branch et name sont requis.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('question_categories')
    .insert({ branch: branch.trim(), name: name.trim(), icon: icon ?? '📂', color: color ?? '#D4A843' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data }, { status: 201 })
}

// DELETE — supprimer une catégorie (god only)
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut supprimer des catégories.' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('question_categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Catégorie supprimée.' })
}
