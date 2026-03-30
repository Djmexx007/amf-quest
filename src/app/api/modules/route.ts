import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 401 })

  const [modulesRes, progressRes, charRes] = await Promise.all([
    supabaseAdmin
      .from('modules')
      .select('*')
      .eq('branch_id', payload.branch_id)
      .eq('is_active', true)
      .order('order_index'),
    supabaseAdmin
      .from('user_module_progress')
      .select('module_id, completion_pct, questions_answered, best_score')
      .eq('user_id', payload.sub)
      .eq('branch_id', payload.branch_id),
    supabaseAdmin
      .from('characters')
      .select('level')
      .eq('user_id', payload.sub)
      .eq('branch_id', payload.branch_id)
      .single(),
  ])

  const progressMap = new Map(
    (progressRes.data ?? []).map(p => [p.module_id, p])
  )

  const modules = (modulesRes.data ?? []).map(mod => ({
    ...mod,
    completion_pct: progressMap.get(mod.id)?.completion_pct ?? 0,
    questions_answered: progressMap.get(mod.id)?.questions_answered ?? 0,
    best_score: progressMap.get(mod.id)?.best_score ?? 0,
  }))

  return NextResponse.json({
    modules,
    character_level: charRes.data?.level ?? 1,
    branch_color: '#D4A843',
  })
}
