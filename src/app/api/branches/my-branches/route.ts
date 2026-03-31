import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

// Returns all branches where this user has a character (multi-branch access)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload) return NextResponse.json({ error: 'Token invalide.' }, { status: 401 })

  // Get all branch IDs where this user has a character
  const { data: characters } = await supabaseAdmin
    .from('characters')
    .select('branch_id')
    .eq('user_id', payload.sub)

  if (!characters || characters.length === 0) {
    return NextResponse.json({ branches: [] })
  }

  const branchIds = characters.map(c => c.branch_id)

  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, slug, name, color, icon')
    .in('id', branchIds)
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({ branches: branches ?? [] })
}
