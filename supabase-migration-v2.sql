-- ============================================================
-- AMF QUEST — Migration v2
-- Run this in the Supabase SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- GAME CONFIG (single-row global config)
-- -------------------------------------------------------
create table if not exists game_config (
  id uuid primary key default uuid_generate_v4(),
  xp_multiplier float not null default 1.0,
  gold_multiplier float not null default 1.0,
  questions_per_game integer not null default 10,
  max_streak_bonus float not null default 1.5,
  maintenance_mode boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default config row if not present
insert into game_config (xp_multiplier, gold_multiplier, questions_per_game, max_streak_bonus)
select 1.0, 1.0, 10, 1.5
where not exists (select 1 from game_config);

-- -------------------------------------------------------
-- Ensure questions table has needed columns
-- (schema should already have these from original schema)
-- -------------------------------------------------------
alter table questions add column if not exists category text;

-- -------------------------------------------------------
-- SEED: Branches (Assurance de personnes, Fonds communs)
-- Skip if already present
-- -------------------------------------------------------
insert into branches (slug, name, description, color, icon, exam_provider, is_active, unlock_level, order_index)
select 'assurance', 'Assurance de personnes', 'Produits d''assurance vie, maladie et invalidité', '#25C292', '🛡️', 'CSF / AMF', true, 1, 1
where not exists (select 1 from branches where slug = 'assurance');

insert into branches (slug, name, description, color, icon, exam_provider, is_active, unlock_level, order_index)
select 'fonds', 'Fonds communs de placement', 'FCP, FNB, fonds distincts et réglementation', '#4D8BFF', '📊', 'IQPF / AMF', true, 1, 2
where not exists (select 1 from branches where slug = 'fonds');

-- -------------------------------------------------------
-- SEED: Modules for Assurance branch
-- -------------------------------------------------------
with branch_id as (select id from branches where slug = 'assurance' limit 1)
insert into modules (branch_id, slug, title, description, icon, unlock_level, order_index)
select
  branch_id.id,
  m.slug, m.title, m.description, m.icon, m.unlock_level, m.order_index
from branch_id, (values
  ('assurance-vie', 'Assurance vie', 'Types de contrats, primes, prestations', '🛡️', 1, 1),
  ('assurance-maladie', 'Assurance maladie', 'Soins médicaux, remboursements, exclusions', '🏥', 1, 2),
  ('assurance-invalidite', 'Assurance invalidité', 'Remplacement de revenu, délais de carence', '♿', 2, 3),
  ('conformite', 'Conformité et éthique', 'Règles AMF/CSF, obligations du représentant', '⚖️', 1, 4)
) as m(slug, title, description, icon, unlock_level, order_index)
on conflict (branch_id, slug) do nothing;

-- -------------------------------------------------------
-- SEED: Modules for Fonds branch
-- -------------------------------------------------------
with branch_id as (select id from branches where slug = 'fonds' limit 1)
insert into modules (branch_id, slug, title, description, icon, unlock_level, order_index)
select
  branch_id.id,
  m.slug, m.title, m.description, m.icon, m.unlock_level, m.order_index
from branch_id, (values
  ('types-fonds', 'Types de fonds', 'FCP, FNB, fonds distincts, ségrégués', '📦', 1, 1),
  ('fiscalite', 'Fiscalité', 'REER, CELI, REEE, FERR et impacts fiscaux', '💰', 1, 2),
  ('risque', 'Gestion du risque', 'Diversification, volatilité, tolérance au risque', '📉', 2, 3),
  ('reglementation', 'Réglementation', 'OCRI, AMF, obligations du représentant', '📋', 1, 4)
) as m(slug, title, description, icon, unlock_level, order_index)
on conflict (branch_id, slug) do nothing;

-- -------------------------------------------------------
-- SEED: Questions — Assurance branch (20 questions)
-- -------------------------------------------------------
do $$
declare
  b_assurance uuid;
  b_fonds uuid;
  m_vie uuid;
  m_maladie uuid;
  m_invalidite uuid;
  m_conformite_a uuid;
  m_types uuid;
  m_fiscalite uuid;
  m_risque uuid;
  m_reglementation uuid;
  q_id uuid;
begin
  select id into b_assurance from branches where slug = 'assurance';
  select id into b_fonds from branches where slug = 'fonds';

  select id into m_vie from modules where slug = 'assurance-vie' and branch_id = b_assurance;
  select id into m_maladie from modules where slug = 'assurance-maladie' and branch_id = b_assurance;
  select id into m_invalidite from modules where slug = 'assurance-invalidite' and branch_id = b_assurance;
  select id into m_conformite_a from modules where slug = 'conformite' and branch_id = b_assurance;
  select id into m_types from modules where slug = 'types-fonds' and branch_id = b_fonds;
  select id into m_fiscalite from modules where slug = 'fiscalite' and branch_id = b_fonds;
  select id into m_risque from modules where slug = 'risque' and branch_id = b_fonds;
  select id into m_reglementation from modules where slug = 'reglementation' and branch_id = b_fonds;

  -- ── ASSURANCE: Q1 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce qu''une assurance vie temporaire?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_vie, 'Qu''est-ce qu''une assurance vie temporaire?', null, '🛡️', 1,
      array['quiz','trivia-crack','dungeon'], 'L''assurance vie temporaire couvre l''assuré pour une période déterminée (ex: 10, 20 ou 30 ans). Si l''assuré décède pendant la période, le capital-décès est versé. Elle est moins chère que l''assurance permanente.', 'TEMPORAIRE = TEMPS LIMITÉ', array['assurance-vie','temporaire'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Une assurance valide pour une période déterminée (ex: 20 ans)', true, 0),
      (q_id, 'Une assurance qui couvre l''assuré toute sa vie', false, 1),
      (q_id, 'Une assurance qui rembourse les soins médicaux', false, 2),
      (q_id, 'Une assurance obligatoire pour obtenir un prêt hypothécaire', false, 3);
  end if;

  -- ── ASSURANCE: Q2 ──
  if not exists (select 1 from questions where question_text = 'Quelle est la principale différence entre l''assurance vie entière et l''assurance vie universelle?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_vie, 'Quelle est la principale différence entre l''assurance vie entière et l''assurance vie universelle?', null, '🛡️', 2,
      array['quiz','trivia-crack'], 'L''assurance vie entière a des primes fixes et une valeur de rachat garantie. L''assurance vie universelle offre une flexibilité dans les primes et un composant d''investissement que le titulaire peut gérer.', 'Entière = rigide, Universelle = flexible', array['assurance-vie','permanente'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'La vie entière a des primes fixes; la vie universelle offre une flexibilité dans les primes et investissements', true, 0),
      (q_id, 'La vie entière est temporaire; la vie universelle est permanente', false, 1),
      (q_id, 'Il n''y a aucune différence, ce sont des synonymes', false, 2),
      (q_id, 'La vie universelle ne comporte pas de capital-décès garanti', false, 3);
  end if;

  -- ── ASSURANCE: Q3 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que le délai de carence en assurance invalidité?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_invalidite, 'Qu''est-ce que le délai de carence en assurance invalidité?', null, '♿', 1,
      array['quiz','trivia-crack','dungeon'], 'Le délai de carence (ou délai d''attente) est la période entre le début de l''invalidité et le premier versement de prestation. Un délai de carence de 90 jours signifie que les prestations ne débutent qu''après 3 mois d''invalidité.', 'Carence = attente avant que l''assurance paye', array['invalidite','delai'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'La période d''attente entre le début de l''invalidité et le premier versement', true, 0),
      (q_id, 'La durée maximale pendant laquelle les prestations sont versées', false, 1),
      (q_id, 'Le montant mensuel versé lors d''une invalidité', false, 2),
      (q_id, 'La période de renouvellement automatique du contrat', false, 3);
  end if;

  -- ── ASSURANCE: Q4 ──
  if not exists (select 1 from questions where question_text = 'Un représentant en assurance de personnes est tenu de recueillir quelles informations avant de recommander un produit?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_conformite_a, 'Un représentant en assurance de personnes est tenu de recueillir quelles informations avant de recommander un produit?', 'Un nouveau client se présente à votre bureau pour obtenir une couverture d''assurance.', '⚖️', 2,
      array['quiz','scenario','trivia-crack'], 'La règle Know Your Client (KYC) oblige le représentant à recueillir les besoins du client, sa situation financière, ses objectifs, sa tolérance au risque et sa situation personnelle (santé, famille) avant toute recommandation.', 'KYC: Connais ton client avant de recommander', array['conformite','kyc','ethique'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Besoins, situation financière, objectifs et tolérance au risque du client', true, 0),
      (q_id, 'Uniquement le nom et l''adresse du client', false, 1),
      (q_id, 'Le numéro de carte de crédit pour facturer les primes', false, 2),
      (q_id, 'Seulement les préférences de produits du client', false, 3);
  end if;

  -- ── ASSURANCE: Q5 ──
  if not exists (select 1 from questions where question_text = 'Quelle est la durée maximale de la période de contestation dans un contrat d''assurance vie au Québec?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_vie, 'Quelle est la durée maximale de la période de contestation dans un contrat d''assurance vie au Québec?', null, '⚖️', 2,
      array['quiz','trivia-crack'], 'Au Québec, la période de contestabilité est de 2 ans. Pendant cette période, l''assureur peut contester le contrat si des fausses déclarations ont été faites lors de la demande. Après 2 ans, sauf en cas de fraude, le contrat est incontestable.', '2 ans = période de contestation standard', array['assurance-vie','contestation','reglementation'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, '2 ans', true, 0),
      (q_id, '1 an', false, 1),
      (q_id, '5 ans', false, 2),
      (q_id, 'Indéfinie', false, 3);
  end if;

  -- ── ASSURANCE: Q6 ──
  if not exists (select 1 from questions where question_text = 'En assurance maladie complémentaire, qu''est-ce que la franchise?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_maladie, 'En assurance maladie complémentaire, qu''est-ce que la franchise?', null, '🏥', 1,
      array['quiz','trivia-crack'], 'La franchise est le montant que l''assuré doit payer lui-même avant que l''assurance commence à couvrir les frais. Par exemple, avec une franchise de 200$, si les frais médicaux totalisent 500$, l''assuré paie 200$ et l''assurance couvre le reste.', 'Franchise = ta part avant que l''assurance paie', array['maladie','franchise'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Le montant que l''assuré doit payer avant que l''assurance couvre les frais', true, 0),
      (q_id, 'Le montant maximum que l''assurance remboursera dans une année', false, 1),
      (q_id, 'La prime mensuelle payée pour maintenir la couverture', false, 2),
      (q_id, 'La liste des médicaments couverts par le régime', false, 3);
  end if;

  -- ── ASSURANCE: Q7 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que la valeur de rachat dans une police d''assurance vie permanente?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_vie, 'Qu''est-ce que la valeur de rachat dans une police d''assurance vie permanente?', null, '💰', 2,
      array['quiz','trivia-crack','dungeon'], 'La valeur de rachat est le montant que l''assureur versera au titulaire s''il résilie son contrat avant le décès. Elle s''accumule progressivement avec les primes payées et est généralement inférieure aux primes versées en début de contrat.', 'Valeur de rachat = ce que tu récupères si tu annules', array['assurance-vie','valeur-rachat','permanente'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Le montant versé si le titulaire résilie son contrat avant décès', true, 0),
      (q_id, 'Le capital-décès payé aux bénéficiaires', false, 1),
      (q_id, 'La prime annuelle du contrat', false, 2),
      (q_id, 'Le montant des dividendes accumulés', false, 3);
  end if;

  -- ── ASSURANCE: Q8 ──
  if not exists (select 1 from questions where question_text = 'Selon la règle AMF, dans quel délai un représentant doit-il remettre une attestation de client reçue au client?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_conformite_a, 'Selon la règle AMF, dans quel délai un représentant doit-il remettre une attestation de client reçue au client?', null, '⚖️', 3,
      array['quiz','trivia-crack'], 'Selon les règles de l''AMF, le représentant doit remettre une copie du document signé au client dans les 10 jours ouvrables suivant la signature.', 'AMF: 10 jours ouvrables pour remettre les documents', array['amf','conformite','delai'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, '10 jours ouvrables', true, 0),
      (q_id, '5 jours ouvrables', false, 1),
      (q_id, '30 jours civils', false, 2),
      (q_id, 'Immédiatement lors de la rencontre', false, 3);
  end if;

  -- ── ASSURANCE: Q9 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que la clause de rétablissement dans un contrat d''assurance vie?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_vie, 'Qu''est-ce que la clause de rétablissement dans un contrat d''assurance vie?', null, '🔄', 2,
      array['quiz','trivia-crack'], 'La clause de rétablissement permet au titulaire de remettre en vigueur une police déchue (dont les primes n''ont pas été payées), généralement dans un délai de 2 à 3 ans, en payant les primes arriérées avec intérêts et en fournissant une preuve d''assurabilité.', 'Rétablissement = réactiver une police annulée', array['assurance-vie','retablissement'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Elle permet de réactiver une police dont les primes n''ont pas été payées', true, 0),
      (q_id, 'Elle augmente automatiquement le capital-décès chaque année', false, 1),
      (q_id, 'Elle permet de changer de bénéficiaire sans frais', false, 2),
      (q_id, 'Elle exclut certaines maladies préexistantes de la couverture', false, 3);
  end if;

  -- ── ASSURANCE: Q10 ──
  if not exists (select 1 from questions where question_text = 'Quelle est la durée minimale d''invalidité généralement requise avant de qualifier de «totale et permanente»?' and branch_id = b_assurance) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_assurance, m_invalidite, 'Quelle est la durée minimale d''invalidité généralement requise avant de qualifier de «totale et permanente»?', null, '♿', 3,
      array['quiz','trivia-crack'], 'La plupart des contrats d''assurance vie définissent l''invalidité totale et permanente comme une incapacité à exercer toute occupation rémunératrice durant au moins 6 mois consécutifs, avec un pronostic de permanence. Cette définition varie selon les contrats.', '6 mois = seuil typique pour invalidité totale permanente', array['invalidite','definition'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, '6 mois consécutifs (varie selon les contrats)', true, 0),
      (q_id, '30 jours consécutifs', false, 1),
      (q_id, '1 an complet', false, 2),
      (q_id, '2 ans', false, 3);
  end if;

  -- ── FONDS: Q1 ──
  if not exists (select 1 from questions where question_text = 'Quelle est la principale différence entre un REER et un CELI?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_fiscalite, 'Quelle est la principale différence entre un REER et un CELI?', null, '💰', 1,
      array['quiz','trivia-crack','dungeon'], 'Le REER (Régime Enregistré d''Épargne-Retraite) offre une déduction fiscale à la cotisation mais les retraits sont imposables. Le CELI (Compte d''Épargne Libre d''Impôt) n''offre pas de déduction, mais les retraits sont entièrement libres d''impôt.', 'REER = déduction maintenant, impôt plus tard. CELI = pas de déduction, jamais d''impôt sur les retraits.', array['fiscalite','reer','celi'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'REER: déductions à la cotisation, retraits imposables. CELI: pas de déduction, retraits non imposables', true, 0),
      (q_id, 'REER et CELI offrent tous deux des retraits libres d''impôt', false, 1),
      (q_id, 'CELI: déductions à la cotisation. REER: retraits non imposables', false, 2),
      (q_id, 'Il n''y a aucune différence fiscale entre les deux', false, 3);
  end if;

  -- ── FONDS: Q2 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que le ratio de frais de gestion (RFG) d''un fonds commun de placement?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_types, 'Qu''est-ce que le ratio de frais de gestion (RFG) d''un fonds commun de placement?', null, '📊', 1,
      array['quiz','trivia-crack','dungeon'], 'Le RFG représente le coût annuel total d''un fonds, exprimé en pourcentage de l''actif net. Il inclut les frais de gestion, les frais d''administration et les taxes. Un RFG de 2% signifie que 2$ sur chaque 100$ investi sert à couvrir ces frais.', 'RFG = coût annuel du fonds en %', array['fonds','rfg','frais'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Le coût annuel total du fonds exprimé en pourcentage de l''actif net', true, 0),
      (q_id, 'Le rendement annuel du fonds avant déduction des frais', false, 1),
      (q_id, 'La commission versée au représentant lors de la vente', false, 2),
      (q_id, 'Le montant minimum requis pour investir dans le fonds', false, 3);
  end if;

  -- ── FONDS: Q3 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce qu''un FNB (Fonds Négocié en Bourse)?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_types, 'Qu''est-ce qu''un FNB (Fonds Négocié en Bourse)?', null, '📈', 1,
      array['quiz','trivia-crack'], 'Un FNB (ou ETF en anglais) est un fonds qui réplique un indice boursier et se négocie comme une action sur une bourse. Il offre généralement un RFG plus bas que les fonds communs traditionnels et une grande liquidité.', 'FNB = indice + négociable en bourse + RFG faible', array['fnb','etf','types-fonds'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Un fonds qui réplique un indice et se négocie comme une action en bourse', true, 0),
      (q_id, 'Un fonds géré activement par un gestionnaire de portefeuille', false, 1),
      (q_id, 'Un compte d''épargne à taux d''intérêt garanti', false, 2),
      (q_id, 'Un fonds réservé aux investisseurs institutionnels', false, 3);
  end if;

  -- ── FONDS: Q4 ──
  if not exists (select 1 from questions where question_text = 'Selon le profil investisseur, qu''est-ce que la tolérance au risque?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_risque, 'Selon le profil investisseur, qu''est-ce que la tolérance au risque?', 'Lors d''une rencontre client, vous devez établir le profil d''investissement de votre client.', '📉', 2,
      array['quiz','scenario','trivia-crack'], 'La tolérance au risque est la capacité psychologique et financière d''un investisseur à supporter les fluctuations de valeur de son portefeuille. Elle dépend de facteurs comme l''horizon de placement, les objectifs, la situation financière et le tempérament du client.', 'Tolérance = accepter les hauts et les bas sans paniquer', array['risque','profil','kyc'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'La capacité à supporter les fluctuations de valeur du portefeuille', true, 0),
      (q_id, 'Le rendement minimum acceptable pour l''investisseur', false, 1),
      (q_id, 'Le montant maximum qu''un investisseur peut perdre légalement', false, 2),
      (q_id, 'La durée pendant laquelle l''investisseur garde ses placements', false, 3);
  end if;

  -- ── FONDS: Q5 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que la diversification en gestion de portefeuille?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_risque, 'Qu''est-ce que la diversification en gestion de portefeuille?', null, '🎯', 1,
      array['quiz','trivia-crack','dungeon'], 'La diversification consiste à répartir les investissements entre différentes classes d''actifs, secteurs et régions géographiques afin de réduire le risque spécifique. L''adage "ne pas mettre tous ses œufs dans le même panier" illustre ce principe.', 'Diversification = répartir pour réduire le risque', array['risque','diversification'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Répartir les investissements entre différents actifs pour réduire le risque', true, 0),
      (q_id, 'Investir tout dans un seul secteur performant', false, 1),
      (q_id, 'Acheter et vendre fréquemment pour maximiser les gains', false, 2),
      (q_id, 'Conserver uniquement des placements garantis', false, 3);
  end if;

  -- ── FONDS: Q6 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que l''OCRI (Organisme canadien de réglementation des investissements)?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_reglementation, 'Qu''est-ce que l''OCRI (Organisme canadien de réglementation des investissements)?', null, '📋', 2,
      array['quiz','trivia-crack'], 'L''OCRI (anciennement ACFM et OCRCVM fusionnés) est l''organisme d''autoréglementation qui supervise les courtiers en valeurs mobilières et en fonds communs de placement au Canada. Il établit des règles de conduite et peut imposer des sanctions disciplinaires.', 'OCRI = organisme qui réglemente les courtiers au Canada', array['reglementation','ocri','acfm'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'L''organisme d''autoréglementation qui supervise les courtiers en valeurs mobilières', true, 0),
      (q_id, 'Le ministère des Finances du Canada', false, 1),
      (q_id, 'L''Autorité des marchés financiers du Québec', false, 2),
      (q_id, 'La Banque du Canada', false, 3);
  end if;

  -- ── FONDS: Q7 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce qu''un REEE (Régime Enregistré d''Épargne-Études)?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_fiscalite, 'Qu''est-ce qu''un REEE (Régime Enregistré d''Épargne-Études)?', null, '🎓', 1,
      array['quiz','trivia-crack','dungeon'], 'Le REEE est un régime permettant d''épargner pour les études postsecondaires d''un enfant. Les cotisations ne sont pas déductibles mais la croissance est à l''abri de l''impôt. Le gouvernement bonifie avec la Subvention canadienne pour l''épargne-études (SCEE): 20% sur les premiers 2 500$ cotisés annuellement.', 'REEE = études + SCEE gouvernementale = 20%', array['fiscalite','reee','education'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Un régime pour épargner les études d''un enfant avec subvention gouvernementale', true, 0),
      (q_id, 'Un régime d''épargne-retraite pour les enseignants', false, 1),
      (q_id, 'Un compte bancaire pour payer les frais de scolarité immédiatement', false, 2),
      (q_id, 'Un prêt étudiant garanti par le gouvernement', false, 3);
  end if;

  -- ── FONDS: Q8 ──
  if not exists (select 1 from questions where question_text = 'Quelle est la règle principale concernant la connaissance du client (KYC) pour un représentant en fonds communs?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_reglementation, 'Quelle est la règle principale concernant la connaissance du client (KYC) pour un représentant en fonds communs?', null, '👤', 2,
      array['quiz','scenario','trivia-crack'], 'La règle KYC exige que le représentant recueille et mette à jour les informations sur le client incluant: situation financière, objectifs de placement, horizon temporel, tolérance au risque et connaissances en placement. Cette information doit être vérifiée régulièrement.', 'KYC = obligation légale de bien connaître ton client', array['reglementation','kyc','conformite'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Recueillir et mettre à jour les informations financières, objectifs et tolérance au risque du client', true, 0),
      (q_id, 'Recommander uniquement les fonds avec le meilleur rendement passé', false, 1),
      (q_id, 'Obtenir l''accord verbal du client avant chaque transaction', false, 2),
      (q_id, 'Vérifier uniquement l''identité du client à l''ouverture du compte', false, 3);
  end if;

  -- ── FONDS: Q9 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que le FERR (Fonds Enregistré de Revenu de Retraite)?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_fiscalite, 'Qu''est-ce que le FERR (Fonds Enregistré de Revenu de Retraite)?', null, '🏖️', 2,
      array['quiz','trivia-crack'], 'Le FERR est un régime dans lequel le REER doit être converti au plus tard le 31 décembre de l''année des 71 ans. Le titulaire doit retirer un montant minimum chaque année selon son âge. Les retraits sont imposables comme revenu.', 'FERR = REER converti à 71 ans, retraits obligatoires', array['fiscalite','ferr','retraite'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Un régime de conversion du REER avec retraits minimaux obligatoires annuels', true, 0),
      (q_id, 'Un fonds d''investissement offert par les banques sans garantie', false, 1),
      (q_id, 'Un régime permettant des cotisations illimitées à la retraite', false, 2),
      (q_id, 'Un compte d''épargne libre d''impôt pour les retraités', false, 3);
  end if;

  -- ── FONDS: Q10 ──
  if not exists (select 1 from questions where question_text = 'Qu''est-ce que le principe de convenance (suitability) dans la vente de fonds communs?' and branch_id = b_fonds) then
    insert into questions (branch_id, module_id, question_text, context_text, icon, difficulty, game_types, explanation, tip, tags, is_active, created_by)
    values (b_fonds, m_reglementation, 'Qu''est-ce que le principe de convenance (suitability) dans la vente de fonds communs?', 'Un client vous demande d''investir tout son REER dans un fonds d''actions spéculatives très risqué. Il a 65 ans et vit de ses économies.', '⚠️', 3,
      array['quiz','scenario','trivia-crack'], 'La convenance exige que le représentant recommande uniquement des placements adaptés au profil spécifique du client (âge, tolérance, objectifs). Dans ce cas, un fonds spéculatif ne serait pas convenable pour un retraité de 65 ans dépendant de ses économies.', 'Convenance = le produit doit correspondre au profil du client', array['reglementation','convenance','suitability'], true, null)
    returning id into q_id;
    insert into answers (question_id, answer_text, is_correct, order_index) values
      (q_id, 'Le produit recommandé doit être adapté au profil, aux objectifs et à la tolérance au risque du client', true, 0),
      (q_id, 'Le représentant doit toujours recommander le fonds avec le meilleur rendement', false, 1),
      (q_id, 'Le client peut exiger n''importe quel produit et le représentant doit s''exécuter', false, 2),
      (q_id, 'La convenance s''applique uniquement aux investisseurs institutionnels', false, 3);
  end if;

end $$;

-- -------------------------------------------------------
-- Verify seeding
-- -------------------------------------------------------
select
  b.name as branch,
  count(q.id) as question_count,
  count(q.id) filter (where q.is_active) as active_questions
from branches b
left join questions q on q.branch_id = b.id
group by b.name, b.order_index
order by b.order_index;
