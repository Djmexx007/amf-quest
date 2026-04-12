import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { isGod, isModerator } from '@/lib/permissions'

// PATCH — approve / reject / toggle / request_delete / cancel_delete / edit
export async function PATCH(
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
  let body: {
    action?: 'approve' | 'reject' | 'toggle' | 'request_delete' | 'cancel_delete' | 'edit'
    question_text?: string
    explanation?: string
    tip?: string | null
    difficulty?: 1 | 2 | 3
    answers?: { answer_text: string; is_correct: boolean }[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const { action } = body

  // ── Approve / Reject ──────────────────────────────────────────
  if (action === 'approve' || action === 'reject') {
    const isApprove = action === 'approve'
    const { error } = await supabaseAdmin
      .from('questions')
      .update({
        status:      isApprove ? 'approved' : 'rejected',
        is_active:   isApprove,
        approved_by: isApprove ? payload.sub : null,
        approved_at: isApprove ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: `question_${action}`,
      details: { question_id: id },
    })

    return NextResponse.json({ message: isApprove ? 'Question approuvée.' : 'Question rejetée.' })
  }

  // ── Toggle active ─────────────────────────────────────────────
  if (action === 'toggle') {
    const { data: q } = await supabaseAdmin
      .from('questions').select('is_active').eq('id', id).single()
    if (!q) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 })

    const nowActive = !q.is_active
    const { error } = await supabaseAdmin
      .from('questions')
      .update({
        is_active: nowActive,
        status: nowActive ? 'approved' : 'rejected',
        approved_by: nowActive ? payload.sub : null,
        approved_at: nowActive ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ is_active: nowActive })
  }

  // ── Request deletion — stored in admin_logs, no schema change needed ──
  if (action === 'request_delete') {
    // Check if already pending for this question
    const { count: existing } = await supabaseAdmin
      .from('admin_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'request_delete_question')
      .filter('details->>question_id', 'eq', id)

    if ((existing ?? 0) > 0) {
      return NextResponse.json({ error: 'Une demande de suppression est déjà en cours.' }, { status: 409 })
    }

    const { error } = await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'request_delete_question',
      details: { question_id: id },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ message: 'Demande de suppression envoyée au God Panel.' })
  }

  // ── Cancel / deny deletion request ───────────────────────────
  if (action === 'cancel_delete') {
    // God can cancel any request; others only their own
    let deleteQ = supabaseAdmin
      .from('admin_logs')
      .delete()
      .eq('action', 'request_delete_question')
      .filter('details->>question_id', 'eq', id)

    if (!isGod(payload.role)) {
      deleteQ = deleteQ.eq('admin_id', payload.sub)
    }

    const { error } = await deleteQ
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'deny_delete_question',
      details: { question_id: id },
    })

    return NextResponse.json({ message: 'Demande de suppression annulée.' })
  }

  // ── Edit question (god only) ──────────────────────────────────
  if (action === 'edit') {
    if (!isGod(payload.role)) {
      return NextResponse.json({ error: 'Seul le GOD peut modifier les questions.' }, { status: 403 })
    }

    const { question_text, explanation, tip, difficulty, answers } = body

    if (!question_text?.trim() || !explanation?.trim()) {
      return NextResponse.json({ error: 'Question et explication requises.' }, { status: 400 })
    }

    const { error: updateErr } = await supabaseAdmin
      .from('questions')
      .update({
        question_text: question_text.trim(),
        explanation: explanation.trim(),
        tip: tip?.trim() || null,
        difficulty,
      })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    if (answers && answers.length >= 2) {
      const filled = answers.filter(a => a.answer_text.trim())
      if (filled.length < 2) {
        return NextResponse.json({ error: 'Au moins 2 réponses requises.' }, { status: 400 })
      }
      await supabaseAdmin.from('answers').delete().eq('question_id', id)
      const { error: ansErr } = await supabaseAdmin.from('answers').insert(
        filled.map((a, i) => ({
          question_id: id,
          answer_text: a.answer_text.trim(),
          is_correct: a.is_correct,
          order_index: i,
        }))
      )
      if (ansErr) return NextResponse.json({ error: ansErr.message }, { status: 500 })
    }

    await supabaseAdmin.from('admin_logs').insert({
      admin_id: payload.sub,
      action: 'edit_question',
      details: { question_id: id },
    })

    return NextResponse.json({ message: 'Question modifiée.' })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}

// DELETE — hard delete (god only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || !isGod(payload.role)) {
    return NextResponse.json({ error: 'Seul le GOD peut supprimer des questions.' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin.from('questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_logs').insert({
    admin_id: payload.sub,
    action: 'delete_question',
    details: { question_id: id },
  })

  return NextResponse.json({ message: 'Question supprimée.' })
}
