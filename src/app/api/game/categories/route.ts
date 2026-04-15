import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

/**
 * GET /api/game/categories
 * Retourne les catégories de questions pour la branche active du joueur.
 * Utilisé par l'Arène du Savoir pour afficher la roue des catégories.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) {
    return NextResponse.json({ error: 'Branche requise.' }, { status: 400 })
  }

  // Résoudre le slug de branche
  const { data: branchData } = await supabaseAdmin
    .from('branches')
    .select('slug')
    .eq('id', payload.branch_id)
    .single()

  if (!branchData) {
    return NextResponse.json({ error: 'Branche introuvable.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('question_categories')
    .select('id, name, icon, color')
    .eq('branch', branchData.slug)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ categories: data ?? [] })
}
