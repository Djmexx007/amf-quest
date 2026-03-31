import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyAccessToken } from '@/lib/auth'
import { calcLevelFromXP, getCharacterClass } from '@/lib/xp-calculator'

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

  // Auto-correct level if out of sync with total XP (e.g. after god XP gifts)
  const { level: correctLevel, xpToNext: correctXpToNext } = calcLevelFromXP(character.xp)
  if (correctLevel !== character.level || correctXpToNext !== character.xp_to_next_level) {
    const correctClass = getCharacterClass(correctLevel)
    await supabaseAdmin
      .from('characters')
      .update({ level: correctLevel, xp_to_next_level: correctXpToNext, class_name: correctClass })
      .eq('id', character.id)
    character.level = correctLevel
    character.xp_to_next_level = correctXpToNext
    character.class_name = correctClass
  }

  const { data: branch } = await supabaseAdmin
    .from('branches')
    .select('slug, name, color, icon, exam_provider')
    .eq('id', payload.branch_id)
    .single()

  // Return equipped items so games can apply visual/gameplay effects
  const { data: inventory } = await supabaseAdmin
    .from('user_inventory')
    .select('item_id, is_equipped, shop_items(id, name, item_type, effect, rarity, is_consumable)')
    .eq('user_id', payload.sub)
    .eq('branch_id', payload.branch_id)
    .eq('is_equipped', true)

  const equipped_items = (inventory ?? []).map(inv => {
    const item = (inv.shop_items as unknown) as { id: string; name: string; item_type: string; effect: Record<string, unknown>; rarity: string; is_consumable: boolean } | null
    return item ? { ...item } : null
  }).filter(Boolean)

  return NextResponse.json({ character, branch, equipped_items })
}
