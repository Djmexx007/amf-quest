import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

function requireGod(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return null
  return payload
}

// GET — fetch current game config
export async function GET(request: NextRequest) {
  if (!requireGod(request)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('game_config')
    .select('*')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return defaults if no config row exists
  return NextResponse.json({
    config: data ?? {
      id: null,
      xp_multiplier: 1.0,
      gold_multiplier: 1.0,
      questions_per_game: 10,
      max_streak_bonus: 1.5,
      maintenance_mode: false,
    },
  })
}

// PATCH — update game config (upsert single row)
export async function PATCH(request: NextRequest) {
  const payload = requireGod(request)
  if (!payload) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: {
    xp_multiplier?: number
    gold_multiplier?: number
    questions_per_game?: number
    max_streak_bonus?: number
    maintenance_mode?: boolean
  }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  // Validate ranges
  if (body.xp_multiplier !== undefined && (body.xp_multiplier < 0.1 || body.xp_multiplier > 10)) {
    return NextResponse.json({ error: 'xp_multiplier doit être entre 0.1 et 10.' }, { status: 400 })
  }
  if (body.gold_multiplier !== undefined && (body.gold_multiplier < 0.1 || body.gold_multiplier > 10)) {
    return NextResponse.json({ error: 'gold_multiplier doit être entre 0.1 et 10.' }, { status: 400 })
  }

  // Get existing row id
  const { data: existing } = await supabaseAdmin
    .from('game_config')
    .select('id')
    .limit(1)
    .maybeSingle()

  let result
  if (existing?.id) {
    result = await supabaseAdmin
      .from('game_config')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabaseAdmin
      .from('game_config')
      .insert({
        xp_multiplier: body.xp_multiplier ?? 1.0,
        gold_multiplier: body.gold_multiplier ?? 1.0,
        questions_per_game: body.questions_per_game ?? 10,
        max_streak_bonus: body.max_streak_bonus ?? 1.5,
        maintenance_mode: body.maintenance_mode ?? false,
      })
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'update_game_config',
    details: body,
  })

  return NextResponse.json({ config: result.data, message: 'Configuration mise à jour.' })
}
