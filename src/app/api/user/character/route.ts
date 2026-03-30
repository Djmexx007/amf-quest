import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('amf_access')?.value
  if (!accessToken) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(accessToken)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche non sélectionnée.' }, { status: 400 })
  }

  const { data: character, error } = await supabaseAdmin
    .from('characters')
    .select('*')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .single()

  if (error || !character) {
    return NextResponse.json({ error: 'Personnage introuvable.' }, { status: 404 })
  }

  // Fetch branch info
  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('slug, name, color, icon, exam_provider')
    .eq('id', payload.branch_id)
    .single()

  return NextResponse.json({ character, branch })
}
