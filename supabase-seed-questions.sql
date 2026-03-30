-- ============================================================
-- AMF QUEST — Questions Seed
-- Run this AFTER supabase-migration-v2.sql
-- ============================================================

DO $$
DECLARE
  b_fonds     uuid;
  b_assurance uuid;
BEGIN
  SELECT id INTO b_fonds     FROM branches WHERE slug = 'fonds'     LIMIT 1;
  SELECT id INTO b_assurance FROM branches WHERE slug = 'assurance' LIMIT 1;

  IF b_fonds IS NULL OR b_assurance IS NULL THEN
    RAISE EXCEPTION 'Branches not found — run migration first';
  END IF;

  -- ================================================================
  -- FONDS COMMUNS DE PLACEMENT — Niveau 1 (Facile)
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, explanation, difficulty, game_types, icon, is_active) VALUES
  (b_fonds, 'Qu''est-ce qu''un fonds commun de placement?',
   'Un fonds commun de placement est un portefeuille collectif géré par un gestionnaire professionnel. Les investisseurs achètent des parts du fonds et partagent les gains, les pertes et les frais.',
   1, ARRAY['quiz','dungeon','trivia-crack','scenario'], '📦', true),

  (b_fonds, 'Qu''est-ce que le ratio de frais de gestion (RFG)?',
   'Le RFG représente le coût annuel total de gestion d''un fonds, exprimé en pourcentage de l''actif du fonds. Il inclut les honoraires du gestionnaire, les frais administratifs et autres dépenses.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '💰', true),

  (b_fonds, 'Quelle est la différence entre un fonds à capital fixe et un fonds à capital variable?',
   'Un fonds à capital fixe émet un nombre limité de parts négociées en bourse comme des actions. Un fonds à capital variable (OPCVM) émet et rachète des parts en continu selon la demande des investisseurs.',
   2, ARRAY['quiz','dungeon','scenario'], '📊', true),

  (b_fonds, 'Qu''est-ce que la valeur liquidative (VL) d''un fonds?',
   'La valeur liquidative est la valeur par part du fonds, calculée en divisant l''actif net total par le nombre de parts en circulation. Elle est généralement calculée à la fin de chaque journée de négociation.',
   1, ARRAY['quiz','trivia-crack','dungeon'], '📈', true),

  (b_fonds, 'Qu''est-ce qu''un REER?',
   'Le Régime enregistré d''épargne-retraite (REER) est un régime d''épargne à avantages fiscaux. Les cotisations sont déductibles d''impôt et les gains s''accumulent à l''abri de l''impôt jusqu''au retrait.',
   1, ARRAY['quiz','trivia-crack','dungeon','scenario'], '🏦', true),

  (b_fonds, 'Qu''est-ce qu''un CELI?',
   'Le Compte d''épargne libre d''impôt (CELI) permet d''épargner et d''investir sans payer d''impôt sur les revenus ou gains en capital générés. Les retraits sont libres d''impôt à tout moment.',
   1, ARRAY['quiz','trivia-crack','dungeon'], '💎', true),

  (b_fonds, 'Qu''est-ce que la diversification dans le contexte des fonds?',
   'La diversification consiste à répartir les investissements dans plusieurs titres, secteurs ou régions géographiques pour réduire le risque global du portefeuille. Elle repose sur le principe que tous les actifs ne baissent pas simultanément.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '🌐', true),

  (b_fonds, 'Qu''est-ce qu''un fonds indiciel?',
   'Un fonds indiciel réplique la composition et le rendement d''un indice boursier (ex: S&P 500, TSX). Il est géré passivement, ce qui entraîne généralement des frais de gestion plus bas qu''un fonds géré activement.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '📉', true),

  (b_fonds, 'Quelle est la différence entre un fonds d''actions et un fonds obligataire?',
   'Un fonds d''actions investit principalement dans des actions d''entreprises (risque plus élevé, rendement potentiel plus élevé). Un fonds obligataire investit dans des obligations gouvernementales ou corporatives (risque plus faible, revenus plus stables).',
   1, ARRAY['quiz','dungeon','scenario','speed-sort'], '⚖️', true),

  (b_fonds, 'Qu''est-ce que le risque de liquidité dans un fonds?',
   'Le risque de liquidité est le risque que le gestionnaire ne puisse pas vendre rapidement les actifs du fonds à un prix juste, notamment lors de conditions de marché difficiles. Certains fonds peuvent suspendre les rachats dans de telles situations.',
   2, ARRAY['quiz','dungeon'], '🌊', true);

  -- Answers for fonds questions
  -- Q1: Fonds commun
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE 'Qu''est-ce qu''un fonds commun%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un portefeuille collectif géré professionnellement où les investisseurs partagent gains et frais','Un compte bancaire à taux garanti','Une police d''assurance sur des placements','Un prêt entre particuliers']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q2: RFG
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%ratio de frais de gestion%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Le coût annuel total de gestion exprimé en % de l''actif','Le rendement annuel garanti du fonds','Les frais de courtage payés à l''achat','Le taux d''intérêt appliqué aux distributions']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q3: Capital fixe vs variable
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%capital fixe%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Capital fixe: parts négociées en bourse; capital variable: parts émises/rachetées en continu','Capital fixe: rendement fixe; capital variable: rendement variable','Capital fixe: fonds d''actions; capital variable: fonds obligataires','Capital fixe: fonds actifs; capital variable: fonds indiciels']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q4: Valeur liquidative
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%valeur liquidative%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['L''actif net total divisé par le nombre de parts en circulation','Le rendement total depuis la création du fonds','Le montant minimum requis pour investir','La valeur de rachat après frais de sortie']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q5: REER
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%REER%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un régime d''épargne-retraite où les cotisations sont déductibles d''impôt','Un compte bancaire sans frais pour la retraite','Un régime gouvernemental de pension','Un fonds d''urgence à l''abri de l''impôt pour les imprévus']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q6: CELI
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%CELI%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un compte où les gains et retraits sont libres d''impôt','Un compte d''épargne avec intérêts garantis par l''État','Un régime de retraite avec cotisations patronales','Un régime où les cotisations sont déductibles d''impôt']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q7: Diversification
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%diversification%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Répartir les investissements pour réduire le risque','Concentrer ses investissements dans un seul secteur performant','Investir uniquement dans des obligations gouvernementales','Maximiser le rendement en ne choisissant que les meilleurs titres']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q8: Fonds indiciel
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%fonds indiciel%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un fonds qui réplique passivement un indice boursier','Un fonds avec un rendement garanti basé sur un indice','Un fonds géré activement pour battre un indice','Un fonds qui investit uniquement dans les sociétés d''un indice']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q9: Actions vs obligations
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%fonds d''actions et un fonds obligataire%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Actions: risque élevé/rendement potentiel élevé; obligations: risque faible/revenus stables','Actions: dividendes garantis; obligations: rendement variable','Actions: court terme; obligations: long terme uniquement','Actions: pour retraités; obligations: pour jeunes investisseurs']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- Q10: Risque de liquidité
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%risque de liquidité%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Risque de ne pas pouvoir vendre les actifs rapidement à un prix juste','Risque que le fonds manque de liquidités pour payer les salaires','Risque que les parts baissent sous leur valeur nominale','Risque de variation des taux d''intérêt sur les obligations']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- ================================================================
  -- FONDS — Niveau 2 (Moyen)
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, context_text, explanation, tip, difficulty, game_types, icon, is_active) VALUES
  (b_fonds, 'Un client veut placer 50 000 $ en vue de la retraite dans 25 ans. Quelle répartition est la plus appropriée?',
   'Client: Marie, 40 ans, tolérance au risque modérée-élevée, revenu annuel 80 000 $, aucune dette.',
   'Avec un horizon de 25 ans et une tolérance modérée-élevée, une répartition orientée vers les actions (70-80%) est appropriée. Le long horizon permet d''absorber la volatilité des marchés.',
   'L''horizon de placement est le facteur clé: plus il est long, plus on peut tolérer de risque.',
   2, ARRAY['quiz','scenario','dungeon'], '🎯', true),

  (b_fonds, 'Quelle est la différence entre un fonds à frais d''acquisition et un fonds sans frais d''acquisition?',
   NULL,
   'Les fonds à frais d''acquisition (chargés) comportent des commissions payées à l''achat (frais frontaux) ou au rachat (frais différés). Les fonds sans frais (non chargés) n''ont pas de tels frais, mais peuvent avoir des frais de gestion plus élevés.',
   NULL,
   2, ARRAY['quiz','dungeon','trivia-crack'], '💵', true),

  (b_fonds, 'Qu''est-ce que le risque systématique (ou risque de marché)?',
   NULL,
   'Le risque systématique affecte l''ensemble du marché et ne peut pas être éliminé par la diversification. Il comprend les récessions économiques, les crises financières, les changements de taux d''intérêt. Contrairement au risque non systématique (propre à un titre), il est inévitable.',
   'Le risque systématique = risque du marché entier; risque non systématique = risque d''une seule entreprise.',
   2, ARRAY['quiz','dungeon'], '📉', true),

  (b_fonds, 'Un client veut racheter ses parts d''un fonds à frais différés (DSC) après 2 ans. À quoi doit-il s''attendre?',
   'Le fonds a des frais de sortie dégressifs: 5,5% la 1ère année, 5% la 2e, 4,5% la 3e, etc.',
   'Avec les frais différés (DSC), des pénalités s''appliquent si le rachat est effectué avant la fin de la période de détention. Après 2 ans, des frais de 5% s''appliqueraient selon le barème indiqué.',
   'Les frais DSC (Deferred Sales Charge) diminuent avec le temps et atteignent 0% après 5-7 ans.',
   2, ARRAY['quiz','scenario','dungeon'], '⚠️', true),

  (b_fonds, 'Qu''est-ce que l''appariement actif-passif en gestion de portefeuille?',
   NULL,
   'L''appariement actif-passif consiste à aligner la durée des actifs d''un portefeuille avec celle des passifs (obligations futures). Cette technique est utilisée par les caisses de retraite et assureurs pour gérer le risque de taux d''intérêt.',
   NULL,
   3, ARRAY['quiz','dungeon'], '⚙️', true),

  (b_fonds, 'Quelle est la règle de l''AMF concernant le document Aperçu du fonds?',
   NULL,
   'L''Aperçu du fonds est un document simplifié d''au maximum 2 pages que les gestionnaires de fonds doivent remettre aux investisseurs avant ou au moment de la souscription. Il contient les informations clés: frais, risques, rendements passés.',
   'L''Aperçu du fonds remplace l''ancien document Faits saillants pour les OPCVM.',
   2, ARRAY['quiz','dungeon','scenario'], '📄', true),

  (b_fonds, 'Qu''est-ce que la règle du KYC (Know Your Client) en contexte de fonds?',
   NULL,
   'Le KYC oblige les représentants à recueillir des informations complètes sur le client: situation financière, tolérance au risque, horizon de placement, objectifs. Ces informations permettent de recommander des produits adaptés et de respecter les obligations légales.',
   'Le KYC est la base de la conformité: pas de recommandation sans profil complet du client.',
   2, ARRAY['quiz','dungeon','scenario','detective'], '🔍', true),

  (b_fonds, 'Un fonds affiche un rendement de 12% sur un an alors que son indice de référence a progressé de 15%. Comment interpréter cela?',
   NULL,
   'Ce fonds a sous-performé son indice de référence de 3 points de pourcentage (15% - 12%). Cette différence s''appelle l''écart de suivi (tracking error). Une sous-performance persistante peut indiquer une gestion active inefficace ou des frais trop élevés.',
   'Comparez toujours le rendement d''un fonds à son indice de référence approprié.',
   2, ARRAY['quiz','dungeon'], '📊', true);

  -- Answers for fonds niveau 2
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%50 000%retraite%25 ans%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['70-80% actions, 20-30% obligations','100% obligations pour sécuriser le capital','50% actions, 50% marché monétaire','100% actions pour maximiser le rendement']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%frais d''acquisition%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Frais d''acquisition: commissions à l''achat/rachat; sans frais: pas de commission directe','Frais d''acquisition: rendement garanti; sans frais: rendement variable','Frais d''acquisition: fonds actifs; sans frais: fonds indiciels','Frais d''acquisition: pour REER; sans frais: pour CELI']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%risque systématique%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Risque affectant tout le marché, non éliminable par la diversification','Risque propre à une entreprise, éliminable par la diversification','Risque lié aux frais de gestion d''un fonds','Risque que le gestionnaire prenne de mauvaises décisions']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%frais différés%DSC%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Des frais de sortie d''environ 5% s''appliqueront','Aucuns frais car il a détenu le fonds plus d''un an','Des frais de 5,5% car c''est le taux de la première année','Des frais de 0% si le rachat est pour un REER']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%appariement actif-passif%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Aligner la durée des actifs avec celle des passifs pour gérer le risque de taux','Équilibrer les fonds actifs et passifs dans un portefeuille','Apparier chaque client actif avec un gestionnaire passif','Synchroniser les achats et ventes d''actifs sur le marché']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%Aperçu du fonds%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Document de max 2 pages remis avant/lors de la souscription','Document de 10 pages remis annuellement aux porteurs de parts','Rapport trimestriel envoyé aux investisseurs','Prospectus simplifié de 5 pages disponible sur demande']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%KYC%Know Your Client%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Obligation de recueillir les infos du client pour recommander des produits adaptés','Obligation de vérifier l''identité du client pour prévenir le blanchiment','Règle interdisant de recommander des produits à risque élevé','Procédure de vérification des antécédents criminels du client']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%12%%indice%15%%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Le fonds a sous-performé son indice de 3%, ce qui peut indiquer des frais élevés ou une gestion inefficace','Le fonds a bien performé car 12% est un rendement positif','Le fonds doit être comparé au taux sans risque, pas à un indice','La différence de 3% est dans la marge d''erreur normale']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- ================================================================
  -- FONDS — Réglementation et conformité (Niveau 2-3)
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, context_text, explanation, tip, difficulty, game_types, icon, is_active) VALUES
  (b_fonds, 'Quelle est la principale obligation d''un représentant en épargne collective envers ses clients?',
   NULL,
   'Le représentant a une obligation de convenance: il doit s''assurer que chaque recommandation est adaptée à la situation financière, aux objectifs, à la tolérance au risque et à l''horizon de placement du client. Cette obligation est le fondement de la relation client-conseiller.',
   NULL,
   2, ARRAY['quiz','dungeon','scenario','detective'], '⚖️', true),

  (b_fonds, 'Qu''est-ce que le prospectus simplifié d''un fonds?',
   NULL,
   'Le prospectus simplifié est un document légal qui décrit en détail le fonds: ses objectifs, sa stratégie de placement, les risques, les frais et la fiscalité. Il doit être remis à l''investisseur au plus tard lors de la souscription et est disponible sur SEDAR+.',
   NULL,
   2, ARRAY['quiz','dungeon','trivia-crack'], '📋', true),

  (b_fonds, 'Dans quel cas un représentant doit-il obligatoirement mettre à jour le profil de son client?',
   NULL,
   'Le profil du client doit être mis à jour lors de changements importants dans sa situation: mariage, divorce, naissance, décès, changement d''emploi, retraite, héritage, ou changement de tolérance au risque. La règle générale est de revoir le profil au moins annuellement.',
   'Tout changement de vie significatif = révision du profil obligatoire.',
   2, ARRAY['quiz','dungeon','scenario'], '🔄', true),

  (b_fonds, 'Qu''est-ce que le conflit d''intérêts dans le contexte de la vente de fonds?',
   NULL,
   'Un conflit d''intérêts survient lorsque l''intérêt personnel du représentant (ex: commission plus élevée sur un produit) entre en opposition avec l''intérêt du client. Le représentant doit divulguer tout conflit d''intérêts et toujours prioriser l''intérêt du client.',
   NULL,
   2, ARRAY['quiz','dungeon','detective'], '⚠️', true),

  (b_fonds, 'Qu''est-ce que le blanchiment d''argent et quelles sont les obligations du représentant?',
   NULL,
   'Le blanchiment d''argent consiste à dissimuler l''origine illicite de fonds en les intégrant dans l''économie légale. Le représentant doit signaler toute transaction suspecte de 10 000 $ ou plus en espèces au CANAFE et effectuer une vérification diligente des clients.',
   'CANAFE = Centre d''analyse des opérations et déclarations financières du Canada.',
   3, ARRAY['quiz','dungeon','detective'], '🔍', true),

  (b_fonds, 'Qu''est-ce que la règle de meilleure exécution en contexte de valeurs mobilières?',
   NULL,
   'La règle de meilleure exécution oblige les courtiers à traiter les ordres des clients de façon à obtenir les conditions les plus avantageuses possibles: meilleur prix, rapidité d''exécution, probabilité d''exécution et de règlement.',
   NULL,
   3, ARRAY['quiz','dungeon'], '🎯', true),

  (b_fonds, 'Un représentant recommande systématiquement des fonds qui lui versent les commissions les plus élevées sans tenir compte du profil du client. Quel problème éthique cela représente-t-il?',
   'Les fonds recommandés ont des RFG entre 2,5% et 3,2%, alors que des alternatives similaires existent à 1,8% RFG.',
   'C''est un conflit d''intérêts grave. Le représentant contrevient à son obligation de convenance et de priorité à l''intérêt du client. Il est passible de sanctions disciplinaires par l''AMF, incluant une suspension ou révocation de son permis.',
   'Le représentant doit toujours pouvoir justifier sa recommandation sur la base du profil du client, pas de sa rémunération.',
   3, ARRAY['quiz','detective','scenario','dungeon'], '🚨', true);

  -- Answers for réglementation fonds
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%principale obligation%représentant en épargne%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Obligation de convenance: recommander des produits adaptés à chaque client','Obligation de rendement: garantir un minimum de performance','Obligation de diversification: toujours répartir sur 5 fonds minimum','Obligation de confidentialité: ne jamais divulguer les placements du client']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%prospectus simplifié%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Document légal décrivant objectifs, stratégie, risques et frais du fonds','Résumé mensuel des transactions du fonds','Rapport annuel des performances historiques du fonds','Formulaire de souscription simplifié pour l''investisseur']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%mettre à jour le profil%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Lors de changements importants dans la situation du client (retraite, mariage, héritage, etc.)','Uniquement si le client le demande explicitement','Tous les 5 ans selon la réglementation de l''AMF','Seulement en cas de perte financière supérieure à 10% du portefeuille']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%conflit d''intérêts%vente de fonds%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Quand l''intérêt personnel du représentant s''oppose à celui du client','Quand deux clients veulent acheter le même fonds limité','Quand le gestionnaire de fonds et le représentant travaillent pour la même firme','Quand un client refuse une recommandation du conseiller']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%blanchiment d''argent%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Déclarer au CANAFE les transactions suspectes et effectuer une vérification diligente','Refuser tout client qui effectue des retraits fréquents','Exiger une lettre de son comptable pour tout montant déposé','Vérifier l''origine des fonds uniquement pour les dépôts de plus de 50 000 $']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%meilleure exécution%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Obligation d''obtenir les meilleures conditions possibles lors du traitement des ordres','Obligation de recommander les fonds les moins chers du marché','Règle exigeant d''exécuter les ordres dans les 24 heures','Obligation de comparer au moins 3 courtiers avant chaque transaction']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%recommande systématiquement%commissions%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un conflit d''intérêts grave contrevenant à l''obligation de convenance, passible de sanctions AMF','Une pratique légale si les rendements des fonds recommandés sont supérieurs','Un comportement acceptable si le client a signé un formulaire d''acceptation','Un problème uniquement si les fonds recommandés perdent de la valeur']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- ================================================================
  -- ASSURANCE — Niveau 1 (Facile)
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, explanation, difficulty, game_types, icon, is_active) VALUES
  (b_assurance, 'Qu''est-ce qu''une police d''assurance vie?',
   'Une police d''assurance vie est un contrat entre l''assuré et l''assureur. En échange de primes, l''assureur s''engage à verser un capital (prestation de décès) aux bénéficiaires désignés au décès de l''assuré.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '🛡️', true),

  (b_assurance, 'Quelle est la différence entre l''assurance vie temporaire et l''assurance vie entière?',
   'L''assurance temporaire couvre une période définie (ex: 10, 20 ans) et expire si l''assuré survit. L''assurance vie entière couvre toute la vie de l''assuré et inclut généralement une valeur de rachat qui s''accumule au fil du temps.',
   1, ARRAY['quiz','dungeon','trivia-crack','speed-sort'], '⚖️', true),

  (b_assurance, 'Qu''est-ce que la valeur de rachat d''une police d''assurance vie entière?',
   'La valeur de rachat est le montant qu''un titulaire peut recevoir s''il annule sa police d''assurance vie entière ou universelle avant son décès. Elle représente la portion épargne accumulée dans la police.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '💰', true),

  (b_assurance, 'Qu''est-ce que l''assurance maladie grave?',
   'L''assurance maladie grave verse un montant forfaitaire à l''assuré s''il est diagnostiqué avec une maladie grave couverte (cancer, crise cardiaque, AVC, etc.) et survit à la période d''attente. L''assuré peut utiliser ce montant comme il le souhaite.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '🏥', true),

  (b_assurance, 'Qu''est-ce que l''assurance invalidité?',
   'L''assurance invalidité remplace une partie du revenu de l''assuré s''il devient incapable de travailler en raison d''une maladie ou d''un accident. Elle verse généralement 60-85% du revenu brut de l''assuré jusqu''à son rétablissement ou sa retraite.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '🦽', true),

  (b_assurance, 'Qu''est-ce que le délai de carence (ou période d''attente) en assurance invalidité?',
   'Le délai de carence est la période qui doit s''écouler après le début de l''invalidité avant que les prestations ne commencent. Un délai plus long (ex: 120 jours) entraîne des primes moins élevées qu''un délai court (ex: 30 jours).',
   1, ARRAY['quiz','dungeon','trivia-crack'], '⏳', true),

  (b_assurance, 'Qu''est-ce qu''un bénéficiaire révocable vs irrévocable?',
   'Un bénéficiaire révocable peut être changé par le titulaire à tout moment sans son consentement. Un bénéficiaire irrévocable ne peut pas être retiré ou modifié sans son consentement écrit, ce qui lui confère certains droits sur la police.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '📝', true),

  (b_assurance, 'Qu''est-ce que la prime d''assurance?',
   'La prime est le montant que l''assuré paie périodiquement (mensuellement, annuellement) à l''assureur en échange de la protection offerte par la police. Son montant dépend de l''âge, de la santé, du montant de couverture et du type de produit.',
   1, ARRAY['quiz','dungeon','trivia-crack'], '💳', true),

  (b_assurance, 'Qu''est-ce que la clause d''exclusion dans une police d''assurance?',
   'Une clause d''exclusion définit les circonstances ou conditions dans lesquelles l''assureur ne versera pas de prestation. Exemples courants: décès par suicide dans les 2 premières années, activités dangereuses non déclarées, fausse déclaration.',
   2, ARRAY['quiz','dungeon','detective'], '🚫', true),

  (b_assurance, 'Qu''est-ce que la subrogation en assurance?',
   'La subrogation est le droit de l''assureur, après avoir indemnisé l''assuré, de poursuivre le tiers responsable du dommage au nom de l''assuré. Cela évite que l''assuré soit indemnisé deux fois pour le même préjudice.',
   2, ARRAY['quiz','dungeon'], '⚖️', true);

  -- Answers for assurance niveau 1
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%police d''assurance vie%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Contrat où l''assureur verse un capital aux bénéficiaires au décès de l''assuré','Compte d''épargne garanti par une compagnie d''assurance','Police qui couvre les accidents mais pas les maladies','Plan de retraite géré par une compagnie d''assurance']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%temporaire et l''assurance vie entière%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Temporaire: couvre une période définie; entière: couvre toute la vie avec valeur de rachat','Temporaire: moins chère à long terme; entière: pour jeunes seulement','Temporaire: inclut une valeur de rachat; entière: couvre uniquement le décès','Temporaire: sans examen médical; entière: exige un examen médical']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%valeur de rachat%assurance vie entière%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Le montant reçu si la police est annulée avant le décès, représentant la portion épargne','Le montant de la prestation de décès remboursé en cas de résiliation','La valeur marchande de la police sur le marché secondaire','Le remboursement des primes versées en cas de décès avant terme']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%assurance maladie grave%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Verse un montant forfaitaire à l''assuré diagnostiqué d''une maladie grave couverte','Rembourse les frais médicaux liés à une maladie grave','Verse des prestations mensuelles jusqu''au rétablissement','Couvre uniquement les frais d''hospitalisation prolongée']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%assurance invalidité%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Remplace une partie du revenu si l''assuré ne peut plus travailler','Verse un capital unique en cas d''invalidité permanente','Couvre uniquement les accidents de travail','Rembourse les frais de réadaptation professionnelle']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%délai de carence%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Période d''attente avant le début des prestations; délai plus long = primes plus basses','Période pendant laquelle l''assureur peut refuser de payer','Délai légal pour contester une décision d''invalidité','Période maximale de versement des prestations d''invalidité']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%bénéficiaire révocable vs irrévocable%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Révocable: peut être changé sans consentement; irrévocable: nécessite consentement écrit','Révocable: bénéficiaire mineur; irrévocable: bénéficiaire majeur','Révocable: pour assurance temporaire; irrévocable: pour assurance vie entière','Révocable: conjoint; irrévocable: enfants']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%prime d''assurance%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Montant payé périodiquement à l''assureur en échange de la protection','Montant versé par l''assureur lors d''un sinistre','Frais administratifs annuels de la police','Bonus versé si aucun sinistre n''est déclaré pendant l''année']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%clause d''exclusion%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Circonstances où l''assureur ne versera pas de prestation (ex: suicide, fausse déclaration)','Clause permettant au client de résilier sans pénalité','Disposition autorisant l''assureur à augmenter les primes','Condition suspensive liée à l''état de santé de l''assuré']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%subrogation%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Droit de l''assureur de poursuivre le tiers responsable après indemnisation de l''assuré','Obligation de l''assuré de couvrir lui-même une portion du sinistre','Processus de transfert d''une police à un autre assureur','Droit de l''assuré d''être indemnisé par deux assureurs simultanément']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- ================================================================
  -- ASSURANCE — Niveau 2 (Moyen) — Scénarios et réglementation
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, context_text, explanation, tip, difficulty, game_types, icon, is_active) VALUES
  (b_assurance, 'Un client de 35 ans veut protéger sa famille en cas de décès. Il a une hypothèque de 300 000 $ et deux enfants. Quel produit recommandez-vous?',
   'Client: 35 ans, marié, deux enfants de 5 et 8 ans, hypothèque de 300 000 $ à 20 ans, revenu annuel 75 000 $.',
   'Une assurance vie temporaire (20-25 ans) correspondant à la durée de l''hypothèque est la solution la plus logique. Elle offre une couverture maximale au coût le plus bas pendant la période où la famille est la plus vulnérable financièrement.',
   'Faites correspondre la durée de couverture à la durée des obligations financières.',
   2, ARRAY['quiz','scenario','dungeon'], '👨‍👩‍👧‍👦', true),

  (b_assurance, 'Qu''est-ce que le principe indemnitaire en assurance de dommages?',
   NULL,
   'Le principe indemnitaire stipule que l''indemnisation ne peut pas dépasser le montant réel du préjudice subi. L''assurance ne doit pas être une source de profit pour l''assuré, mais uniquement le remettre dans la situation où il était avant le sinistre.',
   'En assurance vie, le principe indemnitaire ne s''applique pas car la vie n''a pas de valeur marchande déterminable.',
   2, ARRAY['quiz','dungeon','trivia-crack'], '⚖️', true),

  (b_assurance, 'Un représentant omet de mentionner à son client qu''une police d''assurance comporte une clause d''exclusion pour les sports extrêmes, alors que le client pratique le BASE jump. Quelle est la responsabilité du représentant?',
   NULL,
   'Le représentant a failli à son devoir d''information et de conseil. Il doit divulguer toutes les informations pertinentes, incluant les exclusions qui peuvent affecter le client. Il peut être tenu responsable des préjudices causés et faire l''objet de sanctions disciplinaires.',
   'Le devoir de conseil inclut l''obligation de s''informer des pratiques du client ET de l''informer des exclusions pertinentes.',
   3, ARRAY['quiz','detective','scenario','dungeon'], '🚨', true),

  (b_assurance, 'Qu''est-ce que l''assurance vie universelle et en quoi diffère-t-elle de l''assurance vie entière?',
   NULL,
   'L''assurance vie universelle est un produit flexible qui combine assurance vie et composante épargne. Contrairement à l''assurance vie entière, le titulaire peut ajuster le montant de ses primes et le montant de la couverture, et choisir comment investir la composante épargne.',
   NULL,
   2, ARRAY['quiz','dungeon','trivia-crack'], '🔧', true),

  (b_assurance, 'Quelle est la différence entre la définition "occupation propre" et "toute occupation" en assurance invalidité?',
   NULL,
   'Avec la définition "occupation propre", l''assuré reçoit des prestations s''il ne peut plus exercer sa propre profession, même s''il peut travailler dans un autre domaine. Avec "toute occupation", les prestations cessent si l''assuré peut effectuer n''importe quel travail rémunérateur.',
   'Occupation propre = protection premium pour les professionnels; toute occupation = définition plus restrictive.',
   2, ARRAY['quiz','dungeon','scenario'], '🏥', true),

  (b_assurance, 'Qu''est-ce que la règle 2 ans de contestabilité en assurance vie?',
   NULL,
   'Pendant les 2 premières années d''une police, l''assureur peut enquêter et refuser de payer si l''assuré a fait de fausses déclarations lors de la demande. Après cette période, la police est généralement incontestable, sauf en cas de fraude prouvée.',
   'La période de contestabilité protège l''assureur contre les fausses déclarations initiales.',
   2, ARRAY['quiz','dungeon','detective'], '🔎', true),

  (b_assurance, 'Qu''est-ce que la réassurance et pourquoi les assureurs y recourent-ils?',
   NULL,
   'La réassurance est une assurance pour les assureurs. Une compagnie cède une partie de ses risques à un réassureur en échange d''une prime. Cela permet à l''assureur de prendre en charge de grands risques sans mettre en péril sa stabilité financière.',
   NULL,
   3, ARRAY['quiz','dungeon'], '🏢', true);

  -- Answers for assurance niveau 2
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%35 ans%hypothèque%300 000%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Assurance vie temporaire 20-25 ans pour couvrir la durée de l''hypothèque','Assurance vie entière pour maximiser la valeur de rachat','Assurance maladie grave pour protéger contre les maladies coûteuses','Assurance vie universelle pour la flexibilité des primes']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%principe indemnitaire%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['L''indemnisation ne peut pas dépasser le préjudice réel subi','L''assuré est indemnisé proportionnellement à ses primes versées','L''assureur verse toujours la valeur maximale de la police','Le principe garantissant que les primes restent constantes']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%BASE jump%exclusion%représentant%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Le représentant a manqué à son devoir d''information et peut être sanctionné par l''AMF','Aucune responsabilité car le client aurait dû lire la police lui-même','Responsabilité limitée si la police a été remise au client','Aucun problème si le client a signé le formulaire de proposition']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%assurance vie universelle%diffère%vie entière%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Universelle: flexible (primes et couverture ajustables, épargne investissable); entière: paramètres fixes','Universelle: couvre uniquement le décès; entière: inclut l''invalidité','Universelle: sans valeur de rachat; entière: valeur de rachat garantie','Universelle: temporaire avec renouvellement; entière: permanente sans flexibilité']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%occupation propre%toute occupation%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Occupation propre: prestation si ne peut plus exercer sa profession; toute occupation: prestation si ne peut effectuer aucun travail','Occupation propre: pour cols blancs; toute occupation: pour cols bleus','Occupation propre: court terme; toute occupation: long terme','Occupation propre: moins chère; toute occupation: plus protectrice']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%2 ans de contestabilité%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['L''assureur peut enquêter et refuser en cas de fausses déclarations pendant 2 ans','La police ne peut être modifiée durant les 2 premières années','Le client peut résilier sans pénalité durant 2 ans','L''assureur doit répondre à toute réclamation dans un délai de 2 ans']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%réassurance%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Assurance pour les assureurs permettant de céder une partie des risques à un réassureur','Renouvellement automatique d''une police arrivée à échéance','Couverture complémentaire achetée par l''assuré auprès d''un second assureur','Mécanisme de garantie des dépôts pour les polices d''assurance']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  -- ================================================================
  -- SPEED SORT & MEMORY — Questions avec tags pour ces jeux
  -- ================================================================

  INSERT INTO questions (branch_id, question_text, context_text, explanation, difficulty, game_types, icon, tags, is_active) VALUES
  (b_fonds, 'Quel type de fonds est le plus approprié pour un investisseur très conservateur cherchant la préservation du capital?',
   NULL,
   'Un fonds du marché monétaire investit dans des instruments à court terme très liquides (bons du Trésor, acceptations bancaires). Il offre une très faible volatilité et une bonne protection du capital, idéal pour les investisseurs très conservateurs.',
   1, ARRAY['quiz','trivia-crack','speed-sort','memory'], '🏦',
   ARRAY['types-fonds','profil-investisseur'], true),

  (b_fonds, 'Quel véhicule d''investissement permet de cotiser pour l''éducation de ses enfants avec une subvention gouvernementale?',
   NULL,
   'Le Régime enregistré d''épargne-études (REEE) permet d''épargner pour les études postsecondaires. Le gouvernement fédéral verse une Subvention canadienne pour l''épargne-études (SCEE) de 20% sur les premiers 2 500 $ cotisés par année.',
   1, ARRAY['quiz','trivia-crack','speed-sort','memory'], '🎓',
   ARRAY['regimes-epargne','fiscalite'], true),

  (b_fonds, 'Quels sont les effets d''une hausse des taux d''intérêt sur la valeur des obligations existantes?',
   NULL,
   'Quand les taux d''intérêt montent, la valeur des obligations existantes diminue. C''est une relation inverse: les nouvelles obligations offrent des rendements plus élevés, rendant les anciennes (à taux plus bas) moins attrayantes, donc leur prix baisse.',
   2, ARRAY['quiz','dungeon','speed-sort','memory'], '📉',
   ARRAY['obligations','taux-interet'], true),

  (b_assurance, 'Classez les types d''assurance vie du moins cher au plus cher à court terme: vie entière, temporaire, universelle.',
   NULL,
   'À court terme, l''assurance temporaire est la moins chère car elle ne couvre qu''une période définie. L''universelle est intermédiaire. La vie entière est la plus chère à court terme car elle inclut une composante épargne et couvre toute la vie.',
   1, ARRAY['quiz','speed-sort','memory','trivia-crack'], '💰',
   ARRAY['types-assurance','primes'], true),

  (b_assurance, 'Quel document doit être remis au client lors de la vente d''une police d''assurance au Québec?',
   NULL,
   'Au Québec, le représentant doit remettre au client un Résumé de renseignements (sommaire de la police) avant ou lors de la vente. Ce document présente les caractéristiques essentielles: couverture, primes, exclusions principales.',
   2, ARRAY['quiz','dungeon','detective','memory'], '📋',
   ARRAY['conformite','documents-requis'], true);

  -- Answers for speed-sort/memory questions
  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%très conservateur%préservation du capital%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Fonds du marché monétaire','Fonds d''actions mondiales','Fonds de croissance agressive','Fonds de ressources naturelles']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%REEE%subvention%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Le Régime enregistré d''épargne-études (REEE)','Le Régime enregistré d''épargne-retraite (REER)','Le Compte d''épargne libre d''impôt (CELI)','Le Régime de retraite à prestations déterminées (RRPD)']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_fonds AND question_text ILIKE '%hausse des taux d''intérêt%obligations%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['La valeur des obligations existantes diminue (relation inverse)','La valeur des obligations existantes augmente','La valeur des obligations reste stable car le coupon est fixe','L''effet dépend de la durée restante à l''échéance uniquement']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%du moins cher au plus cher%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Temporaire < Universelle < Vie entière','Vie entière < Universelle < Temporaire','Universelle < Temporaire < Vie entière','Temporaire < Vie entière < Universelle']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

  WITH q AS (SELECT id FROM questions WHERE branch_id = b_assurance AND question_text ILIKE '%document%remis%vente%police%Québec%' LIMIT 1)
  INSERT INTO answers (question_id, answer_text, is_correct, order_index)
  SELECT q.id, unnest(ARRAY['Un Résumé de renseignements (sommaire de la police)','Uniquement la police complète dans les 30 jours','Un formulaire de consentement signé par l''assureur','Le prospectus simplifié approuvé par l''AMF']),
         unnest(ARRAY[true, false, false, false]),
         unnest(ARRAY[0,1,2,3]) FROM q;

END $$;
