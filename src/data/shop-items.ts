// ============================================================
// AMF-QUEST — Shop Items Data (TypeScript)
// Source of truth for programmatic seeding and validation.
// ============================================================

export interface ShopItemSeed {
  name: string
  description: string
  icon: string
  item_type: 'boost' | 'title' | 'cosmetic' | 'sound'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  cost_coins: number
  effect: Record<string, unknown>
  is_consumable: boolean
  is_active: boolean
}

// ── BOOSTS STANDARDS (10) ─────────────────────────────────────
export const STANDARD_BOOSTS: ShopItemSeed[] = [
  { name: 'Boost XP',          description: 'Multiplie ton gain d\'XP ×1.5 pour ta prochaine partie',          icon: '⚡', item_type: 'boost', rarity: 'common',    cost_coins: 150,  effect: { xp_multiplier: 1.5 },                          is_consumable: true,  is_active: true },
  { name: 'Boost Coins',       description: 'Multiplie tes gains de coins ×1.5 pour ta prochaine partie',       icon: '🪙', item_type: 'boost', rarity: 'common',    cost_coins: 150,  effect: { coins_multiplier: 1.5 },                       is_consumable: true,  is_active: true },
  { name: 'Double XP',         description: 'Multiplie ton gain d\'XP ×2 pour ta prochaine partie',             icon: '💫', item_type: 'boost', rarity: 'rare',      cost_coins: 350,  effect: { xp_multiplier: 2 },                            is_consumable: true,  is_active: true },
  { name: 'Double Coins',      description: 'Multiplie tes gains de coins ×2 pour ta prochaine partie',         icon: '💰', item_type: 'boost', rarity: 'rare',      cost_coins: 350,  effect: { coins_multiplier: 2 },                         is_consumable: true,  is_active: true },
  { name: 'Combo Boost',       description: '×1.5 XP et ×1.5 coins simultanément lors de ta prochaine partie', icon: '🌀', item_type: 'boost', rarity: 'rare',      cost_coins: 500,  effect: { xp_multiplier: 1.5, coins_multiplier: 1.5 },   is_consumable: true,  is_active: true },
  { name: 'Mega XP',           description: 'Triple ton gain d\'XP pour dominer le classement',                 icon: '🔥', item_type: 'boost', rarity: 'epic',      cost_coins: 800,  effect: { xp_multiplier: 3 },                            is_consumable: true,  is_active: true },
  { name: 'Revive Donjon',     description: 'Ressuscite une fois dans le donjon lorsque tu tombes à 0 PV',      icon: '💊', item_type: 'boost', rarity: 'rare',      cost_coins: 300,  effect: { dungeon_revive: true },                        is_consumable: true,  is_active: true },
  { name: 'Elixir de Fortune', description: '×2 XP et ×2 coins — double profit garanti',                       icon: '✨', item_type: 'boost', rarity: 'epic',      cost_coins: 1200, effect: { xp_multiplier: 2, coins_multiplier: 2 },       is_consumable: true,  is_active: true },
  { name: 'Transcendance',     description: '×5 XP sur ta prochaine partie — dépasse tes limites',              icon: '🌟', item_type: 'boost', rarity: 'legendary', cost_coins: 2500, effect: { xp_multiplier: 5 },                            is_consumable: true,  is_active: true },
  { name: 'Fortune Absolue',   description: '×4 coins pour une session de richesse pure',                       icon: '👑', item_type: 'boost', rarity: 'legendary', cost_coins: 2200, effect: { coins_multiplier: 4 },                         is_consumable: true,  is_active: true },
]

// ── TITRES STANDARDS (10) ─────────────────────────────────────
export const STANDARD_TITLES: ShopItemSeed[] = [
  { name: 'La Recrue',             description: 'Le début d\'une grande aventure sur AMF Quest',            icon: '🌱', item_type: 'title', rarity: 'common',    cost_coins: 50,   effect: { title: 'La Recrue' },             is_consumable: false, is_active: true },
  { name: 'L\'Analyste',           description: 'Maîtrise des chiffres, des données et des tendances',      icon: '📊', item_type: 'title', rarity: 'common',    cost_coins: 200,  effect: { title: 'L\'Analyste' },           is_consumable: false, is_active: true },
  { name: 'Le Stratège',           description: 'Anticipe chaque mouvement avant que le marché ne bouge',   icon: '♟️', item_type: 'title', rarity: 'rare',      cost_coins: 450,  effect: { title: 'Le Stratège' },           is_consumable: false, is_active: true },
  { name: 'Machine à Cash',        description: 'Transforme chaque opportunité en profit',                   icon: '💸', item_type: 'title', rarity: 'rare',      cost_coins: 650,  effect: { title: 'Machine à Cash' },        is_consumable: false, is_active: true },
  { name: 'Samouraï Financier',    description: 'Discipline absolue et précision chirurgicale',              icon: '⚔️', item_type: 'title', rarity: 'rare',      cost_coins: 500,  effect: { title: 'Samouraï Financier' },    is_consumable: false, is_active: true },
  { name: 'Architecte du Système', description: 'Conçoit les règles du jeu financier',                       icon: '🏛️', item_type: 'title', rarity: 'epic',      cost_coins: 1000, effect: { title: 'Architecte du Système' }, is_consumable: false, is_active: true },
  { name: 'Oracle des Marchés',    description: 'Prédit les tendances avant tous les autres',                 icon: '🔮', item_type: 'title', rarity: 'epic',      cost_coins: 900,  effect: { title: 'Oracle des Marchés' },    is_consumable: false, is_active: true },
  { name: 'Maître AMF',            description: 'Expert certifié des réglementations financières',           icon: '🎖️', item_type: 'title', rarity: 'epic',      cost_coins: 1500, effect: { title: 'Maître AMF' },            is_consumable: false, is_active: true },
  { name: 'Le Prophète',           description: 'Voit ce que les autres n\'osent imaginer',                  icon: '👁️', item_type: 'title', rarity: 'legendary', cost_coins: 2800, effect: { title: 'Le Prophète' },           is_consumable: false, is_active: true },
  { name: 'Légende Vivante',       description: 'Statut mythique et indépassable sur la plateforme',          icon: '🏆', item_type: 'title', rarity: 'legendary', cost_coins: 4500, effect: { title: 'Légende Vivante' },       is_consumable: false, is_active: true },
]

// ── COSMÉTIQUES STANDARDS (10) ────────────────────────────────
export const STANDARD_COSMETICS: ShopItemSeed[] = [
  { name: 'Galaxie',            description: 'Fond galactique avec nuages de particules violettes',      icon: '🌌', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 400,  effect: { background: 'galaxy' },   is_consumable: false, is_active: true },
  { name: 'Abysses',            description: 'Profondeurs mystérieuses des abysses bleues',              icon: '🌊', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 400,  effect: { background: 'abyss' },    is_consumable: false, is_active: true },
  { name: 'Soleil d\'Or',       description: 'Chaleur dorée du succès financier',                        icon: '☀️', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 600,  effect: { background: 'golden' },   is_consumable: false, is_active: true },
  { name: 'Aurore Boréale',     description: 'Danse hypnotique des lumières nordiques',                   icon: '🌿', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 600,  effect: { background: 'aurora' },   is_consumable: false, is_active: true },
  { name: 'Océan Profond',      description: 'L\'immensité apaisante des profondeurs marines',            icon: '💙', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 600,  effect: { background: 'ocean' },    is_consumable: false, is_active: true },
  { name: 'Flammes Infernales', description: 'Interface consumée par un feu purificateur',                icon: '🔥', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 900,  effect: { background: 'fire' },     is_consumable: false, is_active: true },
  { name: 'Cosmique',           description: 'Ondes de l\'univers primordial en expansion',               icon: '🌀', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 900,  effect: { background: 'cosmic' },   is_consumable: false, is_active: true },
  { name: 'Nébuleuse',          description: 'Nuages cosmiques roses et violets en suspension',           icon: '🌸', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 1000, effect: { background: 'nebula' },   is_consumable: false, is_active: true },
  { name: 'Matrix',             description: 'Pluie de code vert qui cascade sans fin',                   icon: '💚', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 1200, effect: { background: 'matrix' },   is_consumable: false, is_active: true },
  { name: 'Diamant',            description: 'Éclats cristallins d\'un diamant pur millénaire',           icon: '💎', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 1800, effect: { background: 'diamond' },  is_consumable: false, is_active: true },
]

// ── SONS STANDARDS (10) ───────────────────────────────────────
export const STANDARD_SOUNDS: ShopItemSeed[] = [
  { name: 'Air Horn',           description: 'BWAAAH retentissant à chaque bonne réponse',           icon: '📯', item_type: 'sound', rarity: 'common',    cost_coins: 200,  effect: { sound: 'airhorn',      trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: 'Trombone Triste',    description: 'Wah-wah-waaah déprimant à chaque erreur',               icon: '😢', item_type: 'sound', rarity: 'common',    cost_coins: 200,  effect: { sound: 'sadTrombone',  trigger: 'wrong'   }, is_consumable: false, is_active: true },
  { name: 'Ba Dum Tss',         description: 'Rimshot comique infaillible après un fail',              icon: '🥁', item_type: 'sound', rarity: 'common',    cost_coins: 250,  effect: { sound: 'rimshot',      trigger: 'wrong'   }, is_consumable: false, is_active: true },
  { name: 'Cha-Ching',          description: 'Caisse enregistreuse sur chaque bonne réponse',         icon: '💰', item_type: 'sound', rarity: 'rare',      cost_coins: 350,  effect: { sound: 'cashRegister', trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: 'Laser Victory',      description: 'Pew ! Bonne réponse instantanée et électrique',         icon: '⚡', item_type: 'sound', rarity: 'rare',      cost_coins: 350,  effect: { sound: 'laser',        trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: 'Cloche de la Gloire',description: 'Ding cristallin et résonnant sur chaque succès',        icon: '🔔', item_type: 'sound', rarity: 'rare',      cost_coins: 400,  effect: { sound: 'ding',         trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: '8-Bit Champion',     description: 'Arpège victoire 8-bit qui remonte le moral',             icon: '🎮', item_type: 'sound', rarity: 'rare',      cost_coins: 450,  effect: { sound: 'powerUp',      trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: 'Sirène de Déroute',  description: 'Sirène stridente et inconfortable sur chaque erreur',   icon: '🚨', item_type: 'sound', rarity: 'epic',      cost_coins: 600,  effect: { sound: 'siren',        trigger: 'wrong'   }, is_consumable: false, is_active: true },
  { name: 'Bass Drop',          description: 'Sub-grave EDM satisfaisant sur bonne réponse',          icon: '🎧', item_type: 'sound', rarity: 'epic',      cost_coins: 700,  effect: { sound: 'bassDrop',     trigger: 'correct' }, is_consumable: false, is_active: true },
  { name: 'Révélation Épique',  description: 'Fanfare cinématique grandiose sur chaque succès',        icon: '🌟', item_type: 'sound', rarity: 'legendary', cost_coins: 1000, effect: { sound: 'epicReveal',   trigger: 'correct' }, is_consumable: false, is_active: true },
]

// ── COFFRES (3) ───────────────────────────────────────────────
export const CHESTS: ShopItemSeed[] = [
  { name: 'Boîte Mystère',     description: 'Une récompense aléatoire t\'attend... XP, coins ou item mystère',          icon: '📦', item_type: 'boost', rarity: 'rare',      cost_coins: 250,  effect: { mystery_box: true, chest_tier: 'novice'    }, is_consumable: true, is_active: true },
  { name: 'Coffre Rare',       description: 'Meilleures chances d\'obtenir rare et épique — items exclusifs possibles',  icon: '🎁', item_type: 'boost', rarity: 'epic',      cost_coins: 600,  effect: { mystery_box: true, chest_tier: 'elite'     }, is_consumable: true, is_active: true },
  { name: 'Coffre Légendaire', description: 'Garantie de récompenses légendaires et items exclusifs ultra-rares',        icon: '👑', item_type: 'boost', rarity: 'legendary', cost_coins: 1500, effect: { mystery_box: true, chest_tier: 'legendary' }, is_consumable: true, is_active: true },
]

// ── BOOSTS EXCLUSIFS (25) ─────────────────────────────────────
export const EXCLUSIVE_BOOSTS: ShopItemSeed[] = [
  { name: 'Accélérateur Quantique', description: 'SECRET — ×2.5 XP sur ta prochaine session',               icon: '🔬', item_type: 'boost', rarity: 'epic',      cost_coins: 0, effect: { xp_multiplier: 2.5, chest_only: true },                         is_consumable: true, is_active: true },
  { name: 'Monétisation Secrète',   description: 'SECRET — ×2.5 coins sur ta prochaine session',             icon: '🏦', item_type: 'boost', rarity: 'epic',      cost_coins: 0, effect: { coins_multiplier: 2.5, chest_only: true },                      is_consumable: true, is_active: true },
  { name: 'Flux Temporel',          description: 'SECRET — ×1.75 XP sur ta prochaine session',               icon: '⏱️', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { xp_multiplier: 1.75, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Dividende Fantôme',      description: 'SECRET — ×1.75 coins sur ta prochaine session',            icon: '👻', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { coins_multiplier: 1.75, chest_only: true },                     is_consumable: true, is_active: true },
  { name: 'Synergie Parfaite',      description: 'SECRET — ×2 XP et ×2 coins simultanément',                 icon: '🔗', item_type: 'boost', rarity: 'epic',      cost_coins: 0, effect: { xp_multiplier: 2, coins_multiplier: 2, chest_only: true },       is_consumable: true, is_active: true },
  { name: 'Surcharge Maximale',     description: 'SECRET — ×3 XP et ×1.5 coins',                             icon: '🌩️', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 3, coins_multiplier: 1.5, chest_only: true },     is_consumable: true, is_active: true },
  { name: 'Prospérité Infinie',     description: 'SECRET — ×3.5 coins',                                      icon: '∞',  item_type: 'boost', rarity: 'epic',      cost_coins: 0, effect: { coins_multiplier: 3.5, chest_only: true },                      is_consumable: true, is_active: true },
  { name: 'Élan Stratégique',       description: 'SECRET — ×4 XP pour une montée en puissance radicale',     icon: '🚀', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 4, chest_only: true },                           is_consumable: true, is_active: true },
  { name: 'Capital Absolu',         description: 'SECRET — ×5 coins',                                        icon: '💳', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { coins_multiplier: 5, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Nexus de Savoir',        description: 'SECRET — ×3.5 XP',                                         icon: '🧠', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 3.5, chest_only: true },                         is_consumable: true, is_active: true },
  { name: 'Bourse Secrète',         description: 'SECRET — ×2 coins accumulés sans prévenir',                icon: '🗝️', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { coins_multiplier: 2, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Catalyseur d\'XP',       description: 'SECRET — ×1.5 XP',                                         icon: '🧪', item_type: 'boost', rarity: 'common',    cost_coins: 0, effect: { xp_multiplier: 1.5, chest_only: true },                         is_consumable: true, is_active: true },
  { name: 'Catalyseur de Coins',    description: 'SECRET — ×1.5 coins',                                      icon: '⚗️', item_type: 'boost', rarity: 'common',    cost_coins: 0, effect: { coins_multiplier: 1.5, chest_only: true },                      is_consumable: true, is_active: true },
  { name: 'Boost Fantôme',          description: 'SECRET — ×2 XP et ×1.5 coins en mode discret',             icon: '🌫️', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { xp_multiplier: 2, coins_multiplier: 1.5, chest_only: true },     is_consumable: true, is_active: true },
  { name: 'Overdrive Monétaire',    description: 'SECRET — ×3 coins',                                        icon: '🔋', item_type: 'boost', rarity: 'epic',      cost_coins: 0, effect: { coins_multiplier: 3, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Vague d\'XP',            description: 'SECRET — ×2 XP',                                           icon: '🌊', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { xp_multiplier: 2, chest_only: true },                           is_consumable: true, is_active: true },
  { name: 'Pluie de Pièces',        description: 'SECRET — ×4 coins',                                        icon: '🌧️', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { coins_multiplier: 4, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Momentum Absolu',        description: 'SECRET — ×2.5 XP et ×2.5 coins',                           icon: '⚖️', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 2.5, coins_multiplier: 2.5, chest_only: true },   is_consumable: true, is_active: true },
  { name: 'Ultime Stimulus',        description: 'SECRET — ×6 XP',                                           icon: '☄️', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 6, chest_only: true },                           is_consumable: true, is_active: true },
  { name: 'Midas Touch',            description: 'SECRET — ×6 coins',                                        icon: '✋', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { coins_multiplier: 6, chest_only: true },                        is_consumable: true, is_active: true },
  { name: 'Amplificateur Divin',    description: 'SECRET — ×3 XP et ×2 coins',                               icon: '📡', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 3, coins_multiplier: 2, chest_only: true },       is_consumable: true, is_active: true },
  { name: 'Revive Élite',           description: 'SECRET — Ressuscite une fois dans le donjon',              icon: '💉', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { dungeon_revive: true, chest_only: true },                       is_consumable: true, is_active: true },
  { name: 'Sprint de Maîtrise',     description: 'SECRET — ×1.5 XP',                                         icon: '🏃', item_type: 'boost', rarity: 'common',    cost_coins: 0, effect: { xp_multiplier: 1.5, chest_only: true },                         is_consumable: true, is_active: true },
  { name: 'Richesse Silencieuse',   description: 'SECRET — ×1.75 coins',                                     icon: '🤫', item_type: 'boost', rarity: 'rare',      cost_coins: 0, effect: { coins_multiplier: 1.75, chest_only: true },                     is_consumable: true, is_active: true },
  { name: 'Convergence',            description: 'SECRET — ×4 XP et ×4 coins',                               icon: '🎯', item_type: 'boost', rarity: 'legendary', cost_coins: 0, effect: { xp_multiplier: 4, coins_multiplier: 4, chest_only: true },       is_consumable: true, is_active: true },
]

// ── TITRES EXCLUSIFS (25) ─────────────────────────────────────
export const EXCLUSIVE_TITLES: ShopItemSeed[] = [
  { name: 'Le Fantôme',              description: 'SECRET — Présent partout, visible nulle part',             icon: '👤', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Le Fantôme',              chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Maître de l\'Ombre',      description: 'SECRET — Opère dans l\'obscurité',                         icon: '🌑', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Maître de l\'Ombre',      chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Le Démiurge',             description: 'SECRET — Façonne la réalité financière à sa volonté',      icon: '🌐', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Le Démiurge',             chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Chasseur de Primes',      description: 'SECRET — Traque les opportunités sans relâche',            icon: '🎯', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Chasseur de Primes',      chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Baron du Marché',         description: 'SECRET — Règne sur les flux financiers',                   icon: '🎩', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Baron du Marché',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'L\'Intemporel',           description: 'SECRET — Transcende les cycles économiques',               icon: '⌛', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'L\'Intemporel',           chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tisserand du Destin',     description: 'SECRET — Tisse les fils invisibles du succès',             icon: '🕸️', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Tisserand du Destin',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Le Titan',                description: 'SECRET — Force implacable des marchés',                    icon: '⚡', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Le Titan',                chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Seigneur des Actifs',     description: 'SECRET — Contrôle tous les actifs du royaume',             icon: '🏰', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Seigneur des Actifs',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'L\'Architecte Suprême',   description: 'SECRET — Conçoit des systèmes d\'une complexité infinie',  icon: '🔑', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'L\'Architecte Suprême',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Phénix de la Bourse',     description: 'SECRET — Renaît de chaque krach plus fort',               icon: '🦅', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Phénix de la Bourse',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Chevalier Quantitatif',   description: 'SECRET — Armé de données et d\'algorithmes',              icon: '🛡️', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Chevalier Quantitatif',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Cartographe des Flux',    description: 'SECRET — Trace les routes invisibles du capital',          icon: '🗺️', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Cartographe des Flux',    chest_only: true }, is_consumable: false, is_active: true },
  { name: 'L\'Alchimiste',           description: 'SECRET — Transmute le savoir en richesse',                 icon: '⚗️', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'L\'Alchimiste',           chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Maître des Probabilités', description: 'SECRET — Calcule l\'incalculable avec sérénité',           icon: '🎲', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Maître des Probabilités', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Le Clairvoyant',          description: 'SECRET — Voit dans le brouillard de l\'incertitude',       icon: '🔭', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Le Clairvoyant',          chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Sentinelle du Capital',   description: 'SECRET — Gardien imperturbable des actifs',                icon: '🗡️', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'Sentinelle du Capital',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Dompteur de Risques',     description: 'SECRET — Apprivoise les marchés les plus volatils',        icon: '🐉', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Dompteur de Risques',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Nécromant Financier',     description: 'SECRET — Ressuscite les portefeuilles en ruine',           icon: '💀', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Nécromant Financier',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'L\'Érudit',               description: 'SECRET — Savant des marchés et de leurs arcanes',          icon: '📚', item_type: 'title', rarity: 'rare',      cost_coins: 0, effect: { title: 'L\'Érudit',               chest_only: true }, is_consumable: false, is_active: true },
  { name: 'L\'Omniscient',           description: 'SECRET — Sait tout avant que ça n\'arrive',               icon: '🌌', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'L\'Omniscient',           chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Maître Quantique',        description: 'SECRET — Opère dans plusieurs dimensions simultanément',   icon: '⚛️', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Maître Quantique',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Virtuose des Actifs',     description: 'SECRET — Joue avec les actifs comme un virtuose',          icon: '🎼', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Virtuose des Actifs',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Le Visionnaire',          description: 'SECRET — Anticipe le futur des marchés avec clarté',       icon: '🔱', item_type: 'title', rarity: 'legendary', cost_coins: 0, effect: { title: 'Le Visionnaire',          chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Conquistador Financier',  description: 'SECRET — Conquiert chaque territoire économique',          icon: '⚜️', item_type: 'title', rarity: 'epic',      cost_coins: 0, effect: { title: 'Conquistador Financier',  chest_only: true }, is_consumable: false, is_active: true },
]

// ── COSMÉTIQUES EXCLUSIFS (20) ────────────────────────────────
export const EXCLUSIVE_COSMETICS: ShopItemSeed[] = [
  { name: 'Forêt Mystique',       description: 'SECRET — Clairière enchantée aux particules vertes',          icon: '🌲', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 0, effect: { background: 'forest',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Coucher de Soleil',    description: 'SECRET — Ciel embrasé aux tons chauds du crépuscule',         icon: '🌅', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 0, effect: { background: 'sunset',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Lave Volcanique',      description: 'SECRET — Lave incandescente aux particules de feu',           icon: '🌋', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'volcanic',      chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Néon Underground',     description: 'SECRET — Néons violets et roses dans les souterrains',        icon: '💜', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'neon',          chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Holographique',        description: 'SECRET — Projection holographique aux reflets cyan',          icon: '🔷', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'holographic',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Toxique',              description: 'SECRET — Vert acide toxique avec particules radioactives',    icon: '☢️', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'toxic',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Vortex Dimensionnel',  description: 'SECRET — Spirale violette entre les dimensions',              icon: '🌀', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'vortex',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Astral',               description: 'SECRET — Plan astral aux étoiles bleutées',                   icon: '✨', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'astral',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Interstellaire',       description: 'SECRET — Voyage entre les étoiles de l\'univers froid',       icon: '🛸', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'interstellaire', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Le Néant',             description: 'SECRET — Obscurité absolue où tout commence et finit',        icon: '⬛', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'neant',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Lune de Sang',         description: 'SECRET — Lune écarlate teintant tout de rouge sang',          icon: '🩸', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'bloodmoon',     chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Émeraude Profond',     description: 'SECRET — Jade pur des profondeurs de la terre',               icon: '💚', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 0, effect: { background: 'emerald',       chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Cristal de Givre',     description: 'SECRET — Cristaux de glace arctiques scintillants',           icon: '❄️', item_type: 'cosmetic', rarity: 'rare',      cost_coins: 0, effect: { background: 'frost',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tempête Électrique',   description: 'SECRET — Éclairs bleus dans un ciel de tempête',              icon: '🌩️', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'storm',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Champ Quantique',      description: 'SECRET — Oscillations teal-cyan du vide quantique',           icon: '⚛️', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'quantum',       chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Plasma',               description: 'SECRET — Plasma rose-magenta aux particules instables',       icon: '🌸', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'plasma',        chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Cyber',                description: 'SECRET — Grille cyberpunk aux lignes cyan électriques',       icon: '🤖', item_type: 'cosmetic', rarity: 'epic',      cost_coins: 0, effect: { background: 'cyber',         chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Inferno Divin',        description: 'SECRET — Brasier cosmique aux flammes orange légendaires',    icon: '🔥', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'inferno',       chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Spectral',             description: 'SECRET — Présence fantomatique entre deux mondes',            icon: '👻', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'spectral',      chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Ombre Pure',           description: 'SECRET — Obscurité violette quasi absolue et intimidante',    icon: '🖤', item_type: 'cosmetic', rarity: 'legendary', cost_coins: 0, effect: { background: 'shadow',        chest_only: true }, is_consumable: false, is_active: true },
]

// ── SONS EXCLUSIFS (30) ───────────────────────────────────────
export const EXCLUSIVE_SOUNDS: ShopItemSeed[] = [
  { name: 'Klaxon de la Honte',       description: 'SECRET — Air Horn humiliant sur chaque erreur',          icon: '📯', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'airhorn',      trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Trombone du Bonheur',      description: 'SECRET — Wah-wah ironique sur les bonnes réponses',      icon: '🎺', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'sadTrombone',  trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Roulement des Héros',      description: 'SECRET — Ba Dum Tss triomphal sur chaque succès',        icon: '🥁', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'rimshot',      trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Alarme d\'Erreur',         description: 'SECRET — Cha-ching inversé pour les mauvaises réponses', icon: '🚨', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'cashRegister', trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tir Manqué',               description: 'SECRET — Laser qui rate la cible à chaque erreur',       icon: '💢', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'laser',        trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Pétomane Glorieux',        description: 'SECRET — Fart épique et sonore sur bonne réponse',       icon: '💨', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'fart',         trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Explosion de Flatulence',  description: 'SECRET — Fart grave et interminable sur erreur',         icon: '💨', item_type: 'sound', rarity: 'common',    cost_coins: 0, effect: { sound: 'fart',         trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Cloche Funèbre',           description: 'SECRET — Ding solennel et funèbre sur chaque erreur',    icon: '⚰️', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'ding',         trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Game Over',                description: 'SECRET — Power-up inversé : game over sur erreur',       icon: '💔', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'powerUp',      trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Sirène de Gloire',         description: 'SECRET — Sirène de victoire retentissante',               icon: '🎉', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'siren',        trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Gong de la Victoire',      description: 'SECRET — Gong impérial sur chaque bonne réponse',        icon: '🔔', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'gong',         trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Gong de la Défaite',       description: 'SECRET — Gong funèbre et résonnant sur chaque erreur',   icon: '🪘', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'gong',         trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tonnerre des Champions',   description: 'SECRET — Tonnerre triomphal sur chaque succès',          icon: '⛈️', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'thunder',      trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tonnerre de la Colère',    description: 'SECRET — Tonnerre furieux et vengeur sur erreur',        icon: '😡', item_type: 'sound', rarity: 'rare',      cost_coins: 0, effect: { sound: 'thunder',      trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Sub-grave Désastre',       description: 'SECRET — Bass drop catastrophique sur chaque erreur',    icon: '💥', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'bassDrop',     trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Révélation Catastrophique',description: 'SECRET — Fanfare épique pour annoncer ton échec',        icon: '🎭', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'epicReveal',   trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Gong Impérial',            description: 'SECRET — Version légendaire du Gong de la Victoire',    icon: '🏯', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'gong',         trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Tonnerre Divin',           description: 'SECRET — Version légendaire du Tonnerre des Champions', icon: '⚡', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'thunder',      trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Pétomane Légendaire',      description: 'SECRET — Fart légendaire et indescriptible',             icon: '👑', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'fart',         trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Klaxon Royal',             description: 'SECRET — Air Horn légendaire pour les erreurs',          icon: '🎺', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'airhorn',      trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Sirène Impériale',         description: 'SECRET — Version légendaire de la Sirène de Gloire',    icon: '🌟', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'siren',        trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Désintégration',           description: 'SECRET — Laser épique et définitif sur chaque erreur',  icon: '💫', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'laser',        trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Crash Monétaire',          description: 'SECRET — Caisse enregistreuse brisée sur erreur',       icon: '📉', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'cashRegister', trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Prophétie Inversée',       description: 'SECRET — Révélation épique pour annoncer la défaite',   icon: '🌀', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'epicReveal',   trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Chute Libre',              description: 'SECRET — Bass drop légendaire sur chaque erreur',        icon: '📊', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'bassDrop',     trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Ovation Satirique',        description: 'SECRET — Rimshot épique et sarcastique sur succès',     icon: '🎭', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'rimshot',      trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Mélodie du Succès Raté',   description: 'SECRET — Trombone épique et absurde sur bonnes réponses',icon: '🎸', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'sadTrombone',  trigger: 'correct', chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Dong Mystique',            description: 'SECRET — Ding solennel et mystérieux sur erreur',       icon: '🔮', item_type: 'sound', rarity: 'epic',      cost_coins: 0, effect: { sound: 'ding',         trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Défaite 8-Bit',            description: 'SECRET — Power-up légendaire inversé sur erreur',       icon: '👾', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'powerUp',      trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
  { name: 'Fart Supreme',             description: 'SECRET — Fart légendaire unique et indescriptible',     icon: '💨', item_type: 'sound', rarity: 'legendary', cost_coins: 0, effect: { sound: 'fart',         trigger: 'wrong',   chest_only: true }, is_consumable: false, is_active: true },
]

// ── ALL ITEMS COMBINED ─────────────────────────────────────────
export const ALL_SHOP_ITEMS: ShopItemSeed[] = [
  ...STANDARD_BOOSTS,
  ...STANDARD_TITLES,
  ...STANDARD_COSMETICS,
  ...STANDARD_SOUNDS,
  ...CHESTS,
  ...EXCLUSIVE_BOOSTS,
  ...EXCLUSIVE_TITLES,
  ...EXCLUSIVE_COSMETICS,
  ...EXCLUSIVE_SOUNDS,
]

export const STANDARD_ITEMS: ShopItemSeed[] = [
  ...STANDARD_BOOSTS,
  ...STANDARD_TITLES,
  ...STANDARD_COSMETICS,
  ...STANDARD_SOUNDS,
  ...CHESTS,
]

export const EXCLUSIVE_ITEMS: ShopItemSeed[] = [
  ...EXCLUSIVE_BOOSTS,
  ...EXCLUSIVE_TITLES,
  ...EXCLUSIVE_COSMETICS,
  ...EXCLUSIVE_SOUNDS,
]
