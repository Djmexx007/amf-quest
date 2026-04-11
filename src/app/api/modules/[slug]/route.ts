import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !payload.branch_id) return NextResponse.json({ error: 'Branche requise.' }, { status: 401 })

  const { slug } = await params

  const [modRes, progressRes, qCountRes, charRes] = await Promise.all([
    supabaseAdmin
      .from('modules')
      .select('*')
      .eq('slug', slug)
      .eq('branch_id', payload.branch_id)
      .eq('is_active', true)
      .single(),

    supabaseAdmin
      .from('user_module_progress')
      .select('completion_pct, questions_answered, correct_answers, best_score, time_spent_seconds, last_activity_at')
      .eq('user_id', payload.sub)
      .eq('branch_id', payload.branch_id)
      .maybeSingle(),

    supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .contains('game_types', ['quiz'])
      .eq('branch_id', payload.branch_id)
      .eq('status', 'approved'),

    supabaseAdmin
      .from('characters')
      .select('level')
      .eq('user_id', payload.sub)
      .eq('branch_id', payload.branch_id)
      .single(),
  ])

  if (!modRes.data) return NextResponse.json({ error: 'Module introuvable.' }, { status: 404 })

  return NextResponse.json({
    module: modRes.data,
    progress: progressRes.data ?? null,
    question_count: qCountRes.count ?? 0,
    character_level: charRes.data?.level ?? 1,
  })
}
