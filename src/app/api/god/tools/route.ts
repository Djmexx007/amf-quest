import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'

type ToolAction =
  | 'purge_expired_invitations'
  | 'expire_stale_accounts'
  | 'bulk_delete_users'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('amf_access')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'god') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let body: { action: ToolAction; user_ids?: string[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 }) }

  const now = new Date().toISOString()

  switch (body.action) {
    case 'purge_expired_invitations': {
      const { count, error } = await supabaseAdmin
        .from('invitations')
        .delete({ count: 'exact' })
        .lt('expires_at', now)
        .eq('status', 'pending')
      if (error) return NextResponse.json({ error: 'Erreur.' }, { status: 500 })

      // Log it
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: payload.sub,
        action: 'purge_expired_invitations',
        details: { count: count ?? 0 },
      })

      return NextResponse.json({ ok: true, affected: count ?? 0 })
    }

    case 'expire_stale_accounts': {
      const { count, error } = await supabaseAdmin
        .from('users')
        .update({ status: 'expired' }, { count: 'exact' })
        .eq('account_type', 'temporary')
        .eq('status', 'active')
        .lt('expires_at', now)
      if (error) return NextResponse.json({ error: 'Erreur.' }, { status: 500 })

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: payload.sub,
        action: 'expire_stale_accounts',
        details: { count: count ?? 0 },
      })

      return NextResponse.json({ ok: true, affected: count ?? 0 })
    }

    case 'bulk_delete_users': {
      if (!body.user_ids?.length) return NextResponse.json({ error: 'Aucun utilisateur sélectionné.' }, { status: 400 })

      // Safety: never delete GOD accounts
      const { data: targets } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .in('id', body.user_ids)

      const deletable = (targets ?? []).filter(u => u.role !== 'god').map(u => u.id)
      if (!deletable.length) return NextResponse.json({ error: 'Aucun utilisateur supprimable.' }, { status: 400 })

      const { error } = await supabaseAdmin.from('users').delete().in('id', deletable)
      if (error) return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })

      await supabaseAdmin.from('admin_logs').insert({
        admin_id: payload.sub,
        action: 'bulk_delete_users',
        details: { user_ids: deletable, count: deletable.length },
      })

      return NextResponse.json({ ok: true, affected: deletable.length })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }
}
