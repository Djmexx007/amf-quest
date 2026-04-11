-- ============================================================
-- AMF-QUEST — Shop Seed
-- Run once to populate shop_items.
-- Safe to re-run: uses WHERE NOT EXISTS guard per item name.
-- ============================================================

-- ── BOOSTS STANDARDS (10) ─────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, cost_coins, effect::jsonb, is_consumable, true
FROM (VALUES
  ('Boost XP',          'Multiplie ton gain d''XP ×1.5 pour ta prochaine partie',          '⚡', 'boost', 'common',    150,  '{"xp_multiplier":1.5}',                          true),
  ('Boost Coins',       'Multiplie tes gains de coins ×1.5 pour ta prochaine partie',       '🪙', 'boost', 'common',    150,  '{"coins_multiplier":1.5}',                       true),
  ('Double XP',         'Multiplie ton gain d''XP ×2 pour ta prochaine partie',             '💫', 'boost', 'rare',      350,  '{"xp_multiplier":2}',                            true),
  ('Double Coins',      'Multiplie tes gains de coins ×2 pour ta prochaine partie',         '💰', 'boost', 'rare',      350,  '{"coins_multiplier":2}',                         true),
  ('Combo Boost',       '×1.5 XP et ×1.5 coins simultanément lors de ta prochaine partie', '🌀', 'boost', 'rare',      500,  '{"xp_multiplier":1.5,"coins_multiplier":1.5}',   true),
  ('Mega XP',           'Triple ton gain d''XP pour dominer le classement',                 '🔥', 'boost', 'epic',      800,  '{"xp_multiplier":3}',                            true),
  ('Revive Donjon',     'Ressuscite une fois dans le donjon lorsque tu tombes à 0 PV',      '💊', 'boost', 'rare',      300,  '{"dungeon_revive":true}',                        true),
  ('Elixir de Fortune', '×2 XP et ×2 coins — double profit garanti',                       '✨', 'boost', 'epic',      1200, '{"xp_multiplier":2,"coins_multiplier":2}',       true),
  ('Transcendance',     '×5 XP sur ta prochaine partie — dépasse tes limites',              '🌟', 'boost', 'legendary', 2500, '{"xp_multiplier":5}',                            true),
  ('Fortune Absolue',   '×4 coins pour une session de richesse pure',                       '👑', 'boost', 'legendary', 2200, '{"coins_multiplier":4}',                         true)
) AS v(name, description, icon, item_type, rarity, cost_coins, effect, is_consumable)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── TITRES STANDARDS (10) ─────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, cost_coins, effect::jsonb, false, true
FROM (VALUES
  ('La Recrue',             'Le début d''une grande aventure sur AMF Quest',           '🌱', 'title', 'common',    50,   '{"title":"La Recrue"}'),
  ('L''Analyste',           'Maîtrise des chiffres, des données et des tendances',     '📊', 'title', 'common',    200,  '{"title":"L''Analyste"}'),
  ('Le Stratège',           'Anticipe chaque mouvement avant que le marché ne bouge', '♟️', 'title', 'rare',      450,  '{"title":"Le Stratège"}'),
  ('Machine à Cash',        'Transforme chaque opportunité en profit',                 '💸', 'title', 'rare',      650,  '{"title":"Machine à Cash"}'),
  ('Samouraï Financier',    'Discipline absolue et précision chirurgicale',            '⚔️', 'title', 'rare',      500,  '{"title":"Samouraï Financier"}'),
  ('Architecte du Système', 'Conçoit les règles du jeu financier',                    '🏛️', 'title', 'epic',     1000,  '{"title":"Architecte du Système"}'),
  ('Oracle des Marchés',    'Prédit les tendances avant tous les autres',              '🔮', 'title', 'epic',      900,  '{"title":"Oracle des Marchés"}'),
  ('Maître AMF',            'Expert certifié des réglementations financières',         '🎖️', 'title', 'epic',     1500,  '{"title":"Maître AMF"}'),
  ('Le Prophète',           'Voit ce que les autres n''osent imaginer',               '👁️', 'title', 'legendary', 2800, '{"title":"Le Prophète"}'),
  ('Légende Vivante',       'Statut mythique et indépassable sur la plateforme',       '🏆', 'title', 'legendary', 4500, '{"title":"Légende Vivante"}')
) AS v(name, description, icon, item_type, rarity, cost_coins, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── COSMÉTIQUES STANDARDS (10) ────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, cost_coins, effect::jsonb, false, true
FROM (VALUES
  ('Galaxie',             'Fond galactique avec nuages de particules violettes',      '🌌', 'cosmetic', 'rare',      400,  '{"background":"galaxy"}'),
  ('Abysses',             'Profondeurs mystérieuses des abysses bleues',              '🌊', 'cosmetic', 'rare',      400,  '{"background":"abyss"}'),
  ('Soleil d''Or',        'Chaleur dorée du succès financier',                        '☀️', 'cosmetic', 'rare',      600,  '{"background":"golden"}'),
  ('Aurore Boréale',      'Danse hypnotique des lumières nordiques',                  '🌿', 'cosmetic', 'rare',      600,  '{"background":"aurora"}'),
  ('Océan Profond',       'L''immensité apaisante des profondeurs marines',           '💙', 'cosmetic', 'rare',      600,  '{"background":"ocean"}'),
  ('Flammes Infernales',  'Interface consumée par un feu purificateur',               '🔥', 'cosmetic', 'epic',      900,  '{"background":"fire"}'),
  ('Cosmique',            'Ondes de l''univers primordial en expansion',              '🌀', 'cosmetic', 'epic',      900,  '{"background":"cosmic"}'),
  ('Nébuleuse',           'Nuages cosmiques roses et violets en suspension',          '🌸', 'cosmetic', 'epic',      1000, '{"background":"nebula"}'),
  ('Matrix',              'Pluie de code vert qui cascade sans fin',                  '💚', 'cosmetic', 'epic',      1200, '{"background":"matrix"}'),
  ('Diamant',             'Éclats cristallins d''un diamant pur millénaire',          '💎', 'cosmetic', 'legendary', 1800, '{"background":"diamond"}')
) AS v(name, description, icon, item_type, rarity, cost_coins, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── SONS STANDARDS (10) ───────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, cost_coins, effect::jsonb, false, true
FROM (VALUES
  ('Air Horn',          'BWAAAH retentissant à chaque bonne réponse',            '📯', 'sound', 'common',    200,  '{"sound":"airhorn","trigger":"correct"}'),
  ('Trombone Triste',   'Wah-wah-waaah déprimant à chaque erreur',               '😢', 'sound', 'common',    200,  '{"sound":"sadTrombone","trigger":"wrong"}'),
  ('Ba Dum Tss',        'Rimshot comique infaillible après un fail',              '🥁', 'sound', 'common',    250,  '{"sound":"rimshot","trigger":"wrong"}'),
  ('Cha-Ching',         'Caisse enregistreuse sur chaque bonne réponse',         '💰', 'sound', 'rare',      350,  '{"sound":"cashRegister","trigger":"correct"}'),
  ('Laser Victory',     'Pew ! Bonne réponse instantanée et électrique',         '⚡', 'sound', 'rare',      350,  '{"sound":"laser","trigger":"correct"}'),
  ('Cloche de la Gloire','Ding cristallin et résonnant sur chaque succès',       '🔔', 'sound', 'rare',      400,  '{"sound":"ding","trigger":"correct"}'),
  ('8-Bit Champion',    'Arpège victoire 8-bit qui remonte le moral',             '🎮', 'sound', 'rare',      450,  '{"sound":"powerUp","trigger":"correct"}'),
  ('Sirène de Déroute', 'Sirène stridente et inconfortable sur chaque erreur',   '🚨', 'sound', 'epic',      600,  '{"sound":"siren","trigger":"wrong"}'),
  ('Bass Drop',         'Sub-grave EDM satisfaisant sur bonne réponse',          '🎧', 'sound', 'epic',      700,  '{"sound":"bassDrop","trigger":"correct"}'),
  ('Révélation Épique', 'Fanfare cinématique grandiose sur chaque succès',        '🌟', 'sound', 'legendary', 1000, '{"sound":"epicReveal","trigger":"correct"}')
) AS v(name, description, icon, item_type, rarity, cost_coins, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── COFFRES (3) ───────────────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, cost_coins, effect::jsonb, true, true
FROM (VALUES
  ('Boîte Mystère',      'Une récompense aléatoire t''attend... XP, coins ou item mystère', '📦', 'boost', 'rare',      250,  '{"mystery_box":true,"chest_tier":"novice"}'),
  ('Coffre Rare',        'Meilleures chances d''obtenir rare et épique — items exclusifs possibles', '🎁', 'boost', 'epic', 600, '{"mystery_box":true,"chest_tier":"elite"}'),
  ('Coffre Légendaire',  'Garantie de récompenses légendaires et items exclusifs ultra-rares',       '👑', 'boost', 'legendary', 1500, '{"mystery_box":true,"chest_tier":"legendary"}')
) AS v(name, description, icon, item_type, rarity, cost_coins, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ============================================================
-- ITEMS EXCLUSIFS COFFRES (100) — chest_only:true
-- Invisibles dans la boutique standard, obtienables via coffres uniquement
-- ============================================================

-- ── BOOSTS EXCLUSIFS (25) ─────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, 0, effect::jsonb, true, true
FROM (VALUES
  ('Accélérateur Quantique', 'SECRET — ×2.5 XP sur ta prochaine session',                '🔬', 'boost', 'epic',      '{"xp_multiplier":2.5,"chest_only":true}'),
  ('Monétisation Secrète',   'SECRET — ×2.5 coins sur ta prochaine session',              '🏦', 'boost', 'epic',      '{"coins_multiplier":2.5,"chest_only":true}'),
  ('Flux Temporel',          'SECRET — ×1.75 XP sur ta prochaine session',               '⏱️', 'boost', 'rare',     '{"xp_multiplier":1.75,"chest_only":true}'),
  ('Dividende Fantôme',      'SECRET — ×1.75 coins sur ta prochaine session',             '👻', 'boost', 'rare',      '{"coins_multiplier":1.75,"chest_only":true}'),
  ('Synergie Parfaite',      'SECRET — ×2 XP et ×2 coins simultanément',                 '🔗', 'boost', 'epic',      '{"xp_multiplier":2,"coins_multiplier":2,"chest_only":true}'),
  ('Surcharge Maximale',     'SECRET — ×3 XP et ×1.5 coins — efficacité absolue',        '🌩️', 'boost', 'legendary','{"xp_multiplier":3,"coins_multiplier":1.5,"chest_only":true}'),
  ('Prospérité Infinie',     'SECRET — ×3.5 coins — richesse sans limites',               '∞',  'boost', 'epic',      '{"coins_multiplier":3.5,"chest_only":true}'),
  ('Élan Stratégique',       'SECRET — ×4 XP pour une montée en puissance radicale',      '🚀', 'boost', 'legendary', '{"xp_multiplier":4,"chest_only":true}'),
  ('Capital Absolu',         'SECRET — ×5 coins — la richesse à l''état pur',             '💳', 'boost', 'legendary', '{"coins_multiplier":5,"chest_only":true}'),
  ('Nexus de Savoir',        'SECRET — ×3.5 XP — connexion directe à l''omniscience',    '🧠', 'boost', 'legendary', '{"xp_multiplier":3.5,"chest_only":true}'),
  ('Bourse Secrète',         'SECRET — ×2 coins accumulés sans prévenir',                 '🗝️', 'boost', 'rare',     '{"coins_multiplier":2,"chest_only":true}'),
  ('Catalyseur d''XP',       'SECRET — ×1.5 XP — premier palier des exclusifs',          '🧪', 'boost', 'common',    '{"xp_multiplier":1.5,"chest_only":true}'),
  ('Catalyseur de Coins',    'SECRET — ×1.5 coins — premier palier des exclusifs',        '⚗️', 'boost', 'common',   '{"coins_multiplier":1.5,"chest_only":true}'),
  ('Boost Fantôme',          'SECRET — ×2 XP et ×1.5 coins en mode discret',             '🌫️', 'boost', 'rare',     '{"xp_multiplier":2,"coins_multiplier":1.5,"chest_only":true}'),
  ('Overdrive Monétaire',    'SECRET — ×3 coins — régime d''overdrive total',             '🔋', 'boost', 'epic',      '{"coins_multiplier":3,"chest_only":true}'),
  ('Vague d''XP',            'SECRET — ×2 XP — déferlante de connaissance',               '🌊', 'boost', 'rare',      '{"xp_multiplier":2,"chest_only":true}'),
  ('Pluie de Pièces',        'SECRET — ×4 coins — il pleut des pièces d''or',             '🌧️', 'boost', 'legendary','{"coins_multiplier":4,"chest_only":true}'),
  ('Momentum Absolu',        'SECRET — ×2.5 XP et ×2.5 coins — synergie maximale',       '⚖️', 'boost', 'legendary', '{"xp_multiplier":2.5,"coins_multiplier":2.5,"chest_only":true}'),
  ('Ultime Stimulus',        'SECRET — ×6 XP — le plus puissant des boosts',              '☄️', 'boost', 'legendary', '{"xp_multiplier":6,"chest_only":true}'),
  ('Midas Touch',            'SECRET — ×6 coins — tout ce que tu touches devient or',     '✋', 'boost', 'legendary', '{"coins_multiplier":6,"chest_only":true}'),
  ('Amplificateur Divin',    'SECRET — ×3 XP et ×2 coins — amplification divine',         '📡', 'boost', 'legendary', '{"xp_multiplier":3,"coins_multiplier":2,"chest_only":true}'),
  ('Revive Élite',           'SECRET — Ressuscite une fois dans le donjon',               '💉', 'boost', 'rare',      '{"dungeon_revive":true,"chest_only":true}'),
  ('Sprint de Maîtrise',     'SECRET — ×1.5 XP — endurance et régularité',               '🏃', 'boost', 'common',    '{"xp_multiplier":1.5,"chest_only":true}'),
  ('Richesse Silencieuse',   'SECRET — ×1.75 coins — gains discrets mais sûrs',           '🤫', 'boost', 'rare',      '{"coins_multiplier":1.75,"chest_only":true}'),
  ('Convergence',            'SECRET — ×4 XP et ×4 coins — convergence totale',           '🎯', 'boost', 'legendary', '{"xp_multiplier":4,"coins_multiplier":4,"chest_only":true}')
) AS v(name, description, icon, item_type, rarity, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── TITRES EXCLUSIFS (25) ─────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, 0, effect::jsonb, false, true
FROM (VALUES
  ('Le Fantôme',              'SECRET — Présent partout, visible nulle part',            '👤', 'title', 'rare',      '{"title":"Le Fantôme","chest_only":true}'),
  ('Maître de l''Ombre',      'SECRET — Opère dans l''obscurité avec une précision absolue', '🌑', 'title', 'epic', '{"title":"Maître de l''Ombre","chest_only":true}'),
  ('Le Démiurge',             'SECRET — Façonne la réalité financière à sa volonté',    '🌐', 'title', 'legendary', '{"title":"Le Démiurge","chest_only":true}'),
  ('Chasseur de Primes',      'SECRET — Traque les opportunités sans relâche',           '🎯', 'title', 'rare',      '{"title":"Chasseur de Primes","chest_only":true}'),
  ('Baron du Marché',         'SECRET — Règne sur les flux financiers',                  '🎩', 'title', 'epic',      '{"title":"Baron du Marché","chest_only":true}'),
  ('L''Intemporel',           'SECRET — Transcende les cycles économiques',              '⌛', 'title', 'legendary', '{"title":"L''Intemporel","chest_only":true}'),
  ('Tisserand du Destin',     'SECRET — Tisse les fils invisibles du succès',            '🕸️', 'title', 'legendary','{"title":"Tisserand du Destin","chest_only":true}'),
  ('Le Titan',                'SECRET — Force implacable des marchés',                   '⚡', 'title', 'epic',      '{"title":"Le Titan","chest_only":true}'),
  ('Seigneur des Actifs',     'SECRET — Contrôle tous les actifs du royaume',            '🏰', 'title', 'legendary', '{"title":"Seigneur des Actifs","chest_only":true}'),
  ('L''Architecte Suprême',   'SECRET — Conçoit des systèmes d''une complexité infinie', '🔑', 'title', 'legendary', '{"title":"L''Architecte Suprême","chest_only":true}'),
  ('Phénix de la Bourse',     'SECRET — Renaît de chaque krach plus fort',              '🦅', 'title', 'legendary', '{"title":"Phénix de la Bourse","chest_only":true}'),
  ('Chevalier Quantitatif',   'SECRET — Armé de données et d''algorithmes',             '🛡️', 'title', 'rare',     '{"title":"Chevalier Quantitatif","chest_only":true}'),
  ('Cartographe des Flux',    'SECRET — Trace les routes invisibles du capital',         '🗺️', 'title', 'rare',     '{"title":"Cartographe des Flux","chest_only":true}'),
  ('L''Alchimiste',           'SECRET — Transmute le savoir en richesse',                '⚗️', 'title', 'epic',     '{"title":"L''Alchimiste","chest_only":true}'),
  ('Maître des Probabilités', 'SECRET — Calcule l''incalculable avec sérénité',          '🎲', 'title', 'epic',      '{"title":"Maître des Probabilités","chest_only":true}'),
  ('Le Clairvoyant',          'SECRET — Voit dans le brouillard de l''incertitude',     '🔭', 'title', 'rare',      '{"title":"Le Clairvoyant","chest_only":true}'),
  ('Sentinelle du Capital',   'SECRET — Gardien imperturbable des actifs',               '🗡️', 'title', 'rare',     '{"title":"Sentinelle du Capital","chest_only":true}'),
  ('Dompteur de Risques',     'SECRET — Apprivoise les marchés les plus volatils',       '🐉', 'title', 'epic',      '{"title":"Dompteur de Risques","chest_only":true}'),
  ('Nécromant Financier',     'SECRET — Ressuscite les portefeuilles en ruine',          '💀', 'title', 'legendary', '{"title":"Nécromant Financier","chest_only":true}'),
  ('L''Érudit',               'SECRET — Savant des marchés et de leurs arcanes',         '📚', 'title', 'rare',      '{"title":"L''Érudit","chest_only":true}'),
  ('L''Omniscient',           'SECRET — Sait tout avant que ça n''arrive',              '🌌', 'title', 'legendary', '{"title":"L''Omniscient","chest_only":true}'),
  ('Maître Quantique',        'SECRET — Opère dans plusieurs dimensions simultanément', '⚛️', 'title', 'legendary', '{"title":"Maître Quantique","chest_only":true}'),
  ('Virtuose des Actifs',     'SECRET — Joue avec les actifs comme un virtuose',         '🎼', 'title', 'epic',      '{"title":"Virtuose des Actifs","chest_only":true}'),
  ('Le Visionnaire',          'SECRET — Anticipe le futur des marchés avec clarté',     '🔱', 'title', 'legendary', '{"title":"Le Visionnaire","chest_only":true}'),
  ('Conquistador Financier',  'SECRET — Conquiert chaque territoire économique',          '⚜️', 'title', 'epic',     '{"title":"Conquistador Financier","chest_only":true}')
) AS v(name, description, icon, item_type, rarity, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── COSMÉTIQUES EXCLUSIFS (20) ────────────────────────────────
-- 10 utilisent les clés BG_PREVIEW existantes non encore assignées
-- 10 utilisent les nouvelles clés ajoutées dans shop/page.tsx
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, 0, effect::jsonb, false, true
FROM (VALUES
  -- Existants (clés BG_PREVIEW déjà dans le code)
  ('Forêt Mystique',        'SECRET — Clairière enchantée aux particules vertes',     '🌲', 'cosmetic', 'rare',      '{"background":"forest","chest_only":true}'),
  ('Coucher de Soleil',     'SECRET — Ciel embrasé aux tons chauds du crépuscule',    '🌅', 'cosmetic', 'rare',      '{"background":"sunset","chest_only":true}'),
  ('Lave Volcanique',       'SECRET — Lave incandescente aux particules de feu',      '🌋', 'cosmetic', 'epic',      '{"background":"volcanic","chest_only":true}'),
  ('Néon Underground',      'SECRET — Néons violets et roses dans les souterrains',   '💜', 'cosmetic', 'epic',      '{"background":"neon","chest_only":true}'),
  ('Holographique',         'SECRET — Projection holographique aux reflets cyan',     '🔷', 'cosmetic', 'epic',      '{"background":"holographic","chest_only":true}'),
  ('Toxique',               'SECRET — Vert acide toxique avec particules radioactives','☢️', 'cosmetic', 'epic',     '{"background":"toxic","chest_only":true}'),
  ('Vortex Dimensionnel',   'SECRET — Spirale violette entre les dimensions',         '🌀', 'cosmetic', 'legendary', '{"background":"vortex","chest_only":true}'),
  ('Astral',                'SECRET — Plan astral aux étoiles bleutées',              '✨', 'cosmetic', 'legendary', '{"background":"astral","chest_only":true}'),
  ('Interstellaire',        'SECRET — Voyage entre les étoiles de l''univers froid',  '🛸', 'cosmetic', 'legendary', '{"background":"interstellaire","chest_only":true}'),
  ('Le Néant',              'SECRET — Obscurité absolue où tout commence et finit',   '⬛', 'cosmetic', 'legendary', '{"background":"neant","chest_only":true}'),
  -- Nouveaux (clés ajoutées dans BG_PREVIEW)
  ('Lune de Sang',          'SECRET — Lune écarlate teintant tout de rouge sang',     '🩸', 'cosmetic', 'epic',      '{"background":"bloodmoon","chest_only":true}'),
  ('Émeraude Profond',      'SECRET — Jade pur des profondeurs de la terre',          '💚', 'cosmetic', 'rare',      '{"background":"emerald","chest_only":true}'),
  ('Cristal de Givre',      'SECRET — Cristaux de glace arctiques scintillants',      '❄️', 'cosmetic', 'rare',      '{"background":"frost","chest_only":true}'),
  ('Tempête Électrique',    'SECRET — Éclairs bleus dans un ciel de tempête',         '🌩️', 'cosmetic', 'epic',     '{"background":"storm","chest_only":true}'),
  ('Champ Quantique',       'SECRET — Oscillations teal-cyan du vide quantique',      '⚛️', 'cosmetic', 'epic',     '{"background":"quantum","chest_only":true}'),
  ('Plasma',                'SECRET — Plasma rose-magenta aux particules instables',  '🌸', 'cosmetic', 'epic',      '{"background":"plasma","chest_only":true}'),
  ('Cyber',                 'SECRET — Grille cyberpunk aux lignes cyan électriques',  '🤖', 'cosmetic', 'epic',      '{"background":"cyber","chest_only":true}'),
  ('Inferno Divin',         'SECRET — Brasier cosmique aux flammes orange légendaires','🔥', 'cosmetic', 'legendary', '{"background":"inferno","chest_only":true}'),
  ('Spectral',              'SECRET — Présence fantomatique entre deux mondes',        '👻', 'cosmetic', 'legendary', '{"background":"spectral","chest_only":true}'),
  ('Ombre Pure',            'SECRET — Obscurité violette quasi absolue et intimidante','🖤', 'cosmetic', 'legendary', '{"background":"shadow","chest_only":true}')
) AS v(name, description, icon, item_type, rarity, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ── SONS EXCLUSIFS (30) ───────────────────────────────────────
INSERT INTO shop_items (name, description, icon, item_type, rarity, cost_coins, effect, is_consumable, is_active)
SELECT name, description, icon, item_type, rarity::text, 0, effect::jsonb, false, true
FROM (VALUES
  ('Klaxon de la Honte',      'SECRET — Air Horn humiliant sur chaque erreur',          '📯', 'sound', 'rare',      '{"sound":"airhorn","trigger":"wrong","chest_only":true}'),
  ('Trombone du Bonheur',     'SECRET — Wah-wah ironique sur les bonnes réponses',      '🎺', 'sound', 'legendary', '{"sound":"sadTrombone","trigger":"correct","chest_only":true}'),
  ('Roulement des Héros',     'SECRET — Ba Dum Tss triomphal sur chaque succès',        '🥁', 'sound', 'rare',      '{"sound":"rimshot","trigger":"correct","chest_only":true}'),
  ('Alarme d''Erreur',        'SECRET — Cha-ching inversé pour les mauvaises réponses', '🚨', 'sound', 'rare',      '{"sound":"cashRegister","trigger":"wrong","chest_only":true}'),
  ('Tir Manqué',              'SECRET — Laser qui rate la cible à chaque erreur',       '💢', 'sound', 'rare',      '{"sound":"laser","trigger":"wrong","chest_only":true}'),
  ('Pétomane Glorieux',       'SECRET — Fart épique et sonore sur bonne réponse',       '💨', 'sound', 'epic',      '{"sound":"fart","trigger":"correct","chest_only":true}'),
  ('Explosion de Flatulence', 'SECRET — Fart grave et interminable sur erreur',         '💨', 'sound', 'common',    '{"sound":"fart","trigger":"wrong","chest_only":true}'),
  ('Cloche Funèbre',          'SECRET — Ding solennel et funèbre sur chaque erreur',    '⚰️', 'sound', 'rare',     '{"sound":"ding","trigger":"wrong","chest_only":true}'),
  ('Game Over',               'SECRET — Power-up inversé : game over sur erreur',       '💔', 'sound', 'epic',      '{"sound":"powerUp","trigger":"wrong","chest_only":true}'),
  ('Sirène de Gloire',        'SECRET — Sirène de victoire retentissante',               '🎉', 'sound', 'epic',      '{"sound":"siren","trigger":"correct","chest_only":true}'),
  ('Gong de la Victoire',     'SECRET — Gong impérial sur chaque bonne réponse',        '🔔', 'sound', 'epic',      '{"sound":"gong","trigger":"correct","chest_only":true}'),
  ('Gong de la Défaite',      'SECRET — Gong funèbre et résonnant sur chaque erreur',   '🪘', 'sound', 'epic',      '{"sound":"gong","trigger":"wrong","chest_only":true}'),
  ('Tonnerre des Champions',  'SECRET — Tonnerre triomphal sur chaque succès',          '⛈️', 'sound', 'epic',     '{"sound":"thunder","trigger":"correct","chest_only":true}'),
  ('Tonnerre de la Colère',   'SECRET — Tonnerre furieux et vengeur sur erreur',        '😡', 'sound', 'rare',      '{"sound":"thunder","trigger":"wrong","chest_only":true}'),
  ('Sub-grave Désastre',      'SECRET — Bass drop catastrophique sur chaque erreur',    '💥', 'sound', 'epic',      '{"sound":"bassDrop","trigger":"wrong","chest_only":true}'),
  ('Révélation Catastrophique','SECRET — Fanfare épique pour annoncer ton échec',       '🎭', 'sound', 'legendary', '{"sound":"epicReveal","trigger":"wrong","chest_only":true}'),
  ('Gong Impérial',           'SECRET — Version légendaire du Gong de la Victoire',    '🏯', 'sound', 'legendary', '{"sound":"gong","trigger":"correct","chest_only":true}'),
  ('Tonnerre Divin',          'SECRET — Version légendaire du Tonnerre des Champions', '⚡', 'sound', 'legendary', '{"sound":"thunder","trigger":"correct","chest_only":true}'),
  ('Pétomane Légendaire',     'SECRET — Fart légendaire et indescriptible',             '👑', 'sound', 'legendary', '{"sound":"fart","trigger":"correct","chest_only":true}'),
  ('Klaxon Royal',            'SECRET — Air Horn légendaire pour les erreurs',          '🎺', 'sound', 'epic',      '{"sound":"airhorn","trigger":"wrong","chest_only":true}'),
  ('Sirène Impériale',        'SECRET — Version légendaire de la Sirène de Gloire',    '🌟', 'sound', 'legendary', '{"sound":"siren","trigger":"correct","chest_only":true}'),
  ('Désintégration',          'SECRET — Laser épique et définitif sur chaque erreur',  '💫', 'sound', 'epic',      '{"sound":"laser","trigger":"wrong","chest_only":true}'),
  ('Crash Monétaire',         'SECRET — Caisse enregistreuse brisée sur erreur',       '📉', 'sound', 'epic',      '{"sound":"cashRegister","trigger":"wrong","chest_only":true}'),
  ('Prophétie Inversée',      'SECRET — Révélation épique pour annoncer la défaite',   '🌀', 'sound', 'epic',      '{"sound":"epicReveal","trigger":"wrong","chest_only":true}'),
  ('Chute Libre',             'SECRET — Bass drop légendaire sur chaque erreur',        '📊', 'sound', 'legendary', '{"sound":"bassDrop","trigger":"wrong","chest_only":true}'),
  ('Ovation Satirique',       'SECRET — Rimshot épique et sarcastique sur succès',     '🎭', 'sound', 'epic',      '{"sound":"rimshot","trigger":"correct","chest_only":true}'),
  ('Mélodie du Succès Raté',  'SECRET — Trombone épique et absurde sur bonnes réponses','🎸', 'sound', 'epic',      '{"sound":"sadTrombone","trigger":"correct","chest_only":true}'),
  ('Dong Mystique',           'SECRET — Ding solennel et mystérieux sur erreur',       '🔮', 'sound', 'epic',      '{"sound":"ding","trigger":"wrong","chest_only":true}'),
  ('Défaite 8-Bit',           'SECRET — Power-up légendaire inversé sur erreur',       '👾', 'sound', 'legendary', '{"sound":"powerUp","trigger":"wrong","chest_only":true}'),
  ('Fart Supreme',            'SECRET — Fart légendaire unique et indescriptible',     '💨', 'sound', 'legendary', '{"sound":"fart","trigger":"wrong","chest_only":true}')
) AS v(name, description, icon, item_type, rarity, effect)
WHERE NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name);

-- ============================================================
-- Verification query (optional)
-- SELECT item_type, rarity, COUNT(*) FROM shop_items GROUP BY item_type, rarity ORDER BY item_type, rarity;
-- ============================================================
