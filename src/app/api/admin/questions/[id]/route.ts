import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod, isModerator } from '@/lib/permissions'

// PATCH — modifier une question (god only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut modifier les questions.' }, { status: 403 })
  }

  const { id } = await params

  let body: {
    question?: string
    context?: string | null
    answers?: string[]
    correct_answer?: string
    category?: string
    is_scenario?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { question, context, answers, correct_answer, category, is_scenario } = body

  if (question !== undefined && !question?.trim()) {
    return NextResponse.json({ error: 'La question ne peut pas être vide.' }, { status: 400 })
  }

  // Validation des réponses si fournies
  if (answers !== undefined) {
    const filled = answers.map(a => a?.trim()).filter(Boolean)
    if (filled.length < 2) {
      return NextResponse.json({ error: 'Au moins 2 réponses non-vides sont requises.' }, { status: 400 })
    }
    const ca = correct_answer?.trim()
    if (!ca) {
      return NextResponse.json({ error: 'La bonne réponse est obligatoire.' }, { status: 400 })
    }
    if (!filled.includes(ca)) {
      return NextResponse.json({ error: 'La bonne réponse doit faire partie des réponses.' }, { status: 400 })
    }
  }

  const update: Record<string, unknown> = {}
  if (question     !== undefined) update.question     = question.trim()
  if (context      !== undefined) update.context      = context?.trim() || null
  if (answers      !== undefined) update.answers      = answers.map(a => a.trim()).filter(Boolean)
  if (correct_answer !== undefined) update.correct_answer = correct_answer.trim()
  if (category     !== undefined) update.category     = category.trim()
  if (is_scenario  !== undefined) update.is_scenario  = is_scenario

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('questions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'edit_question',
    details: { question_id: id },
  })

  return NextResponse.json({ message: 'Question modifiée.' })
}

// DELETE — supprimer une question (moderator: demande | god: direct)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const payload = verifyAccessToken(token)
  if (!payload || !isModerator(payload.role)) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { id } = await params

  if (isGod(payload.role)) {
    // Suppression directe pour GOD
    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'delete_question',
      details: { question_id: id },
    })

    return NextResponse.json({ message: 'Question supprimée.' })
  }

  // Moderator: demande de suppression via admin_logs
  const { count: existing } = await supabaseAdmin
    .from('admin_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'request_delete_question')
    .contains('details', { question_id: id })

  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: 'Une demande de suppression est déjà en cours.' }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'request_delete_question',
    details: { question_id: id },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Demande de suppression envoyée.' })
}
