import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data: branches, error } = await supabaseAdmin
    .from('branches')
    .select('id, slug, name, description, color, icon, exam_provider')
    .eq('is_active', true)
    .order('order_index')

  if (error) {
    return NextResponse.json({ error: 'Erreur lors du chargement des branches.' }, { status: 500 })
  }

  return NextResponse.json({ branches: branches ?? [] })
}
