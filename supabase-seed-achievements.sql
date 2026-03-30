-- ============================================================
-- AMF QUEST — Achievements Seed
-- Run AFTER supabase-schema.sql and after branches exist
-- ============================================================

DO $$
DECLARE
  assurance_id uuid;
  fonds_id     uuid;
BEGIN
  SELECT id INTO assurance_id FROM branches WHERE slug = 'assurance';
  SELECT id INTO fonds_id     FROM branches WHERE slug = 'fonds-mutuel';

  -- ── Global achievements (branch_id = NULL) ───────────────

  INSERT INTO achievements (branch_id, slug, title, description, icon, condition_type, condition_value, xp_reward, coin_reward, rarity)
  VALUES
    (NULL, 'first-game',        'Première aventure',        'Complète ta première partie.',                   '⚔️',  'games_played',       1,    50,   25,  'common'),
    (NULL, 'games-10',          'Habitué des arènes',       'Complète 10 parties.',                           '🏟️',  'games_played',       10,   150,  75,  'common'),
    (NULL, 'games-50',          'Combattant aguerri',       'Complète 50 parties.',                           '🗡️',  'games_played',       50,   400,  200, 'rare'),
    (NULL, 'games-100',         'Légendaire',               'Complète 100 parties.',                          '👑',  'games_played',       100,  1000, 500, 'legendary'),
    (NULL, 'streak-3',          'Régularité',               'Maintiens un streak de 3 jours.',                '🔥',  'streak_days',        3,    100,  50,  'common'),
    (NULL, 'streak-7',          'Semaine parfaite',         'Maintiens un streak de 7 jours.',                '🌟',  'streak_days',        7,    300,  150, 'rare'),
    (NULL, 'streak-30',         'Mois de feu',              'Maintiens un streak de 30 jours.',               '☀️',  'streak_days',        30,   1500, 750, 'legendary'),
    (NULL, 'correct-50',        'Bon élève',                'Réponds correctement à 50 questions.',           '📝',  'correct_answers',    50,   200,  100, 'common'),
    (NULL, 'correct-200',       'Expert des questions',     'Réponds correctement à 200 questions.',          '🎓',  'correct_answers',    200,  600,  300, 'rare'),
    (NULL, 'correct-500',       'Maître absolu',            'Réponds correctement à 500 questions.',          '🏆',  'correct_answers',    500,  1500, 750, 'epic'),
    (NULL, 'level-5',           'Analyste junior',          'Atteins le niveau 5.',                           '📊',  'level_reached',      5,    250,  125, 'common'),
    (NULL, 'level-10',          'Conseiller certifié',      'Atteins le niveau 10.',                          '💼',  'level_reached',      10,   500,  250, 'rare'),
    (NULL, 'level-20',          'Expert reconnu',           'Atteins le niveau 20.',                          '🔮',  'level_reached',      20,   1200, 600, 'epic'),
    (NULL, 'level-50',          'Légende vivante',          'Atteins le niveau 50.',                          '⚜️',  'level_reached',      50,   5000, 2500,'legendary'),
    (NULL, 'all-games',         'Touche-à-tout',            'Joue à tous les mini-jeux au moins une fois.',   '🎮',  'unique_game_types',  8,    500,  250, 'epic')
  ON CONFLICT (branch_id, slug) DO NOTHING;

  -- ── Assurance branch achievements ────────────────────────

  INSERT INTO achievements (branch_id, slug, title, description, icon, condition_type, condition_value, xp_reward, coin_reward, rarity)
  VALUES
    (assurance_id, 'amf-first-quiz',    'Initié AMF',          'Complète ton premier Quiz Éclair en Assurance.',      '🛡️',  'games_played',    1,    75,   35,  'common'),
    (assurance_id, 'amf-dungeon-boss',  'Chasseur de dragons', 'Bats le boss du Donjon Roguelike.',                   '🐉',  'boss_defeated',   1,    300,  150, 'rare'),
    (assurance_id, 'amf-perfect-quiz',  'Score parfait',       'Obtiens 100% dans un Quiz Éclair.',                   '💯',  'perfect_score',   1,    400,  200, 'epic'),
    (assurance_id, 'amf-coins-500',     'Petit épargnant',     'Accumule 500 pièces en Assurance.',                   '🪙',  'coins_total',     500,  100,  0,   'common'),
    (assurance_id, 'amf-coins-2000',    'Investisseur averti', 'Accumule 2 000 pièces en Assurance.',                 '💰',  'coins_total',     2000, 250,  0,   'rare'),
    (assurance_id, 'amf-memory-ace',    'As de la mémoire',    'Complète une partie Memory Match sans erreur.',       '🃏',  'perfect_memory',  1,    350,  175, 'epic')
  ON CONFLICT (branch_id, slug) DO NOTHING;

  -- ── Fonds communs branch achievements ────────────────────

  INSERT INTO achievements (branch_id, slug, title, description, icon, condition_type, condition_value, xp_reward, coin_reward, rarity)
  VALUES
    (fonds_id, 'csi-first-quiz',     'Initié CSI',          'Complète ton premier Quiz Éclair en Fonds communs.',  '📈',  'games_played',    1,    75,   35,  'common'),
    (fonds_id, 'csi-dungeon-boss',   'Briseur de marchés',  'Bats le boss du Donjon Roguelike.',                   '📉',  'boss_defeated',   1,    300,  150, 'rare'),
    (fonds_id, 'csi-perfect-quiz',   'Score parfait',       'Obtiens 100% dans un Quiz Éclair.',                   '💯',  'perfect_score',   1,    400,  200, 'epic'),
    (fonds_id, 'csi-coins-500',      'Petit portefeuille',  'Accumule 500 pièces en Fonds communs.',               '🪙',  'coins_total',     500,  100,  0,   'common'),
    (fonds_id, 'csi-coins-2000',     'Gestionnaire actif',  'Accumule 2 000 pièces en Fonds communs.',             '💰',  'coins_total',     2000, 250,  0,   'rare'),
    (fonds_id, 'csi-speed-sort-ace', 'Trieuse rapide',      'Trie 20 produits sans erreur en Speed Sort.',         '🌪️',  'speed_sort_ace',  1,    350,  175, 'epic')
  ON CONFLICT (branch_id, slug) DO NOTHING;

END $$;
