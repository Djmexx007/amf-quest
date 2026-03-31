'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

type Difficulty = 1 | 2 | 3
type Phase = 'intro' | 'playing' | 'result'
type ViolationType = 'omission' | 'inadapte' | 'conflit' | 'documentation' | 'manipulation' | 'fausse_declaration'

const VIOLATION_TYPES: { key: ViolationType; label: string; color: string }[] = [
  { key: 'omission',           label: 'Omission matérielle',  color: '#F59E0B' },
  { key: 'inadapte',           label: 'Produit inadapté',      color: '#FF4D6A' },
  { key: 'conflit',            label: "Conflit d'intérêts",    color: '#a78bfa' },
  { key: 'documentation',      label: 'Documentation absente', color: '#4D8BFF' },
  { key: 'manipulation',       label: 'Manipulation / Fraude', color: '#f97316' },
  { key: 'fausse_declaration', label: 'Fausse déclaration',    color: '#ec4899' },
]

interface Block {
  id: string
  text: string
  isViolation: boolean
  violationType?: ViolationType
  explanation: string
}

interface Case {
  id: string
  title: string
  context: string
  blocks: Block[]
  difficulty: Difficulty
  timeLimit: number
}

const DIFF_CONFIG = {
  1: { label: 'Stagiaire',   color: '#25C292', desc: '4 min · Violations évidentes · 2 indices',       hintCount: 2 },
  2: { label: 'Inspecteur',  color: '#D4A843', desc: '3 min · Violations subtiles · Sans indice',      hintCount: 0 },
  3: { label: 'Expert AMF',  color: '#FF4D6A', desc: '2.5 min · Doit catégoriser chaque infraction',   hintCount: 0 },
} as const

// ─── Dossiers ──────────────────────────────────────────────────────────────────

const CASES: Case[] = [
  // ══ DIFFICULTÉ 1 ══════════════════════════════════════════════════════════════
  {
    id: 'leblanc',
    title: 'Dossier Leblanc — Assurance invalidité',
    context: "Menuisier autonome de 43 ans. Analysez la conformité de la recommandation d'assurance.",
    difficulty: 1,
    timeLimit: 240,
    blocks: [
      {
        id: 'b1',
        text: "PROPOSITION D'ASSURANCE INVALIDITÉ — 15 mars 2024\nClient: Jean-Pierre Leblanc, 43 ans\nOccupation: Travailleur autonome — menuisier depuis 18 ans\nRevenu annuel brut: 68 000 $",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'b2',
        text: "RECOMMANDATION DU CONSEILLER:\nProduit: Assurance invalidité — toute occupation (définition large)\nPrime mensuelle: 287 $/mois\nJustification: \"Le client souhaitait réduire sa prime mensuelle. La définition toute occupation permet une prime inférieure de 22 % comparativement à propre occupation.\"",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Un menuisier exerçant un métier manuel spécialisé depuis 18 ans doit être couvert en « propre occupation ». La définition « toute occupation » peut le forcer à accepter n'importe quel autre emploi malgré son invalidité pour son métier, neutralisant la protection visée. Le seul critère de prix ne justifie pas ce choix.",
      },
      {
        id: 'b3',
        text: "CONDITIONS DU CONTRAT:\nDélai de carence: 30 jours\nDurée des prestations: 2 ans\nMontant mensuel: 3 400 $ (50 % du revenu)\nOptions additionnelles: aucune",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Une durée de prestations de 2 ans est insuffisante pour un travailleur autonome de 43 ans sans fonds d'urgence documenté. L'incapacité de reprendre un métier manuel peut excéder largement 2 ans. La norme sectorielle pour ce profil est généralement « jusqu'à 65 ans ».",
      },
      {
        id: 'b4',
        text: "ANALYSE DU BESOIN:\nLe client n'a pas d'assurance collective. Il souhaite protéger son revenu en cas de blessure. Il a trois enfants à charge et une hypothèque de 245 000 $.",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'b5',
        text: "DÉCLARATION DE SANTÉ:\nQ1: Consultation médicale dans les 2 dernières années? R: Non\nQ2: Médicaments sur ordonnance? R: Non\nQ3: Problèmes de dos, cou ou membres dans les 5 dernières années? R: Non (case cochée par le conseiller)\nQ4: Chirurgie antérieure? R: Non",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'b6',
        text: "NOTES DU CONSEILLER (usage interne):\nRemarque: lors de l'entretien, le client a mentionné verbalement avoir subi une hernie discale L4-L5 en 2022, avec arrêt de travail de 6 semaines. Le conseiller a estimé que cette information n'était pas pertinente compte tenu du délai écoulé et n'a pas modifié le questionnaire.",
        isViolation: true,
        violationType: 'omission',
        explanation: "Une hernie discale avec arrêt de travail documenté est une information matérielle pour une police d'assurance invalidité. L'omettre volontairement peut annuler la police en cas de réclamation. Le conseiller ne peut décider unilatéralement de l'impertinence d'une information de santé divulguée.",
      },
      {
        id: 'b7',
        text: "SIGNATURES:\nSignature du client: J.P. Leblanc (Date: 15/03/2024)\nSignature du conseiller: M. Tremblay (Date: 15/03/2024)\nL'original est conservé au dossier.",
        isViolation: false,
        explanation: '',
      },
    ],
  },

  {
    id: 'roy',
    title: 'Dossier Roy — REER et placements',
    context: 'Cliente de 62 ans, retraite dans 3 ans. Vérifiez l\'adéquation des recommandations de placement.',
    difficulty: 1,
    timeLimit: 240,
    blocks: [
      {
        id: 'r1',
        text: "FICHE CLIENT\nNom: Marguerite Roy, 62 ans — Infirmière\nRetraite prévue: dans 3 ans (à 65 ans)\nRevenu: 71 000 $/an | Épargne REER: 148 000 $\nProfil investisseur: Modéré (signé janvier 2024)",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'r2',
        text: "RECOMMANDATION DE PLACEMENT:\nRépartition proposée dans le REER:\n— 80 % actions croissance (technologie, marchés émergents)\n— 15 % obligations à haut rendement (BBB-)\n— 5 % liquidités\nJustification: \"La cliente désire maximiser la croissance de son capital.\"",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Une répartition de 80 % en actions de croissance est incompatible avec un profil « modéré » et un horizon de 3 ans avant la retraite. Un effondrement boursier à cette étape ne laisserait pas le temps de récupérer les pertes — la recommandation contredit directement le profil signé.",
      },
      {
        id: 'r3',
        text: "FRAIS ET CONDITIONS:\nFrais de gestion annuels (MER): 2,45 %\nFrais de rachat dégressifs: de 6 % (an 1) à 0 % (an 7)\nPériode minimale de détention recommandée: 7 ans\nLe conseiller a précisé que les frais étaient « standards dans l'industrie ».",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Des frais de rachat pouvant atteindre 6 % et une période de détention de 7 ans sont incompatibles avec un horizon de 3 ans avant la retraite. La cliente doit être explicitement informée que retirer avant 7 ans entraîne des pénalités importantes.",
      },
      {
        id: 'r4',
        text: "DOCUMENTATION REMISE:\nQuestionnaire de profil investisseur: signé\nFormulaire KYC: mis à jour janvier 2024\nLettre d'explication des risques: non remise — le conseiller déclare l'avoir expliqué verbalement\nSignature d'autorisation: client uniquement",
        isViolation: true,
        violationType: 'documentation',
        explanation: "La lettre d'explication des risques est un document réglementaire obligatoire lors de recommandations de produits à risque élevé. Elle doit être remise au client par écrit — pas seulement expliquée verbalement.",
      },
      {
        id: 'r5',
        text: "OBJECTIFS DÉCLARÉS:\n— Croissance à long terme du capital\n— Protection du capital pour la retraite\n— Accès aux fonds sans pénalité d'ici 3-4 ans si nécessaire\nNote du conseiller: \"Cliente ouverte à la volatilité à court terme.\"",
        isViolation: true,
        violationType: 'fausse_declaration',
        explanation: "La cliente a demandé un accès sans pénalité d'ici 3-4 ans — directement incompatible avec les frais dégressifs sur 7 ans recommandés. La note du conseiller (« ouverte à la volatilité ») contredit le profil modéré signé et semble minimiser les préoccupations de la cliente.",
      },
      {
        id: 'r6',
        text: "RÉMUNÉRATION:\nMode: commissions de vente + frais de suivi annuels\nCommission initiale: 4,2 % | Frais de suivi: 0,5 %/an\nCette information a été communiquée à la cliente au moment de la signature.",
        isViolation: false,
        explanation: '',
      },
    ],
  },

  // ══ DIFFICULTÉ 2 ══════════════════════════════════════════════════════════════
  {
    id: 'martin',
    title: 'Dossier Martin — Fonds à effet de levier',
    context: 'Investisseur intermédiaire, 38 ans. Cinq manquements sont présents dans ce dossier.',
    difficulty: 2,
    timeLimit: 200,
    blocks: [
      {
        id: 'm1',
        text: "PROFIL CLIENT\nNom: Daniel Martin, 38 ans — Technicien en informatique\nRevenu: 62 000 $/an | Actif net: 95 000 $\nProfil investisseur: Croissance (signé octobre 2023)\nExpérience: intermédiaire (actions, FCP simples)",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'm2',
        text: "PRODUIT RECOMMANDÉ:\nFonds à effet de levier 2× sur l'indice S&P 500 (ETF synthétique)\nMontant investi: 40 000 $ (42 % de l'actif net)\nJustification: \"Le client désire une exposition accrue au marché américain et comprend le fonctionnement des produits à effet de levier.\"",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Les ETF à effet de levier 2× sont des produits spéculatifs à court terme — ils ne sont pas conçus pour des placements à long terme en raison de l'érosion par la volatilité (beta decay). Investir 42 % de l'actif net d'un profil « croissance » (pas spéculatif) dans ce type de produit dépasse la tolérance au risque déclarée.",
      },
      {
        id: 'm3',
        text: "VÉRIFICATION DE COMPRÉHENSION:\nLe conseiller a confirmé verbalement que le client « comprend » les mécanismes de l'effet de levier. Aucun test de connaissance écrit n'a été effectué. Le document de divulgation des risques propres aux produits à effet de levier n'a pas été remis.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Pour les produits complexes, la simple confirmation verbale est insuffisante. Un document de divulgation des risques spécifique doit être remis et signé. L'absence de document signé ne prouve pas le consentement éclairé.",
      },
      {
        id: 'm4',
        text: "NOTE INTERNE DU CONSEILLER:\n\"Client enthousiaste, peu de questions. M'a demandé quel rendement il pouvait attendre. Je lui ai dit qu'avec un marché haussier, il pouvait facilement doubler sa mise en 12-18 mois.\"",
        isViolation: true,
        violationType: 'fausse_declaration',
        explanation: "Promettre ou laisser entendre un rendement spécifique (« doubler sa mise en 12-18 mois ») constitue une représentation trompeuse prohibée. Toute projection doit être accompagnée de mises en garde claires sur les risques de perte.",
      },
      {
        id: 'm5',
        text: "STRUCTURE DE RÉMUNÉRATION:\nCommission de vente perçue: 1 200 $ (3 % du montant investi)\nCe fonds est distribué exclusivement par la firme du conseiller.\nLe conseiller n'a pas mentionné l'existence de fonds alternatifs moins coûteux offrant une exposition similaire.",
        isViolation: true,
        violationType: 'conflit',
        explanation: "Le conseiller distribue un produit maison avec commission élevée sans informer le client d'alternatives. L'absence de solutions comparatives suggère que l'intérêt du conseiller a primé sur celui du client — conflit d'intérêts à divulguer.",
      },
      {
        id: 'm6',
        text: "MISE À JOUR DU PROFIL:\nDernier questionnaire KYC: octobre 2023 (il y a 6 mois)\nChangement de situation déclaré: divorce en cours, garde partagée de 2 enfants\nNote du conseiller: \"Situation personnelle stable.\"",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Un divorce en cours avec garde partagée constitue un changement significatif exigeant une mise à jour du profil investisseur. Inscrire « situation stable » alors que le client vit un divorce est inexact.",
      },
      {
        id: 'm7',
        text: "SIGNATURES:\nAutorisation de placement signée par le client: 12 avril 2024\nFormulaire d'ouverture de compte: en règle\nDocument KYC: signé octobre 2023",
        isViolation: false,
        explanation: '',
      },
    ],
  },

  {
    id: 'caron',
    title: 'Dossier Caron — Retraite et gestion de risque',
    context: 'Client de 58 ans, retraite à 60 ans. Identifiez les manquements réglementaires.',
    difficulty: 2,
    timeLimit: 200,
    blocks: [
      {
        id: 'c1',
        text: "FICHE CLIENT\nNom: Bernard Caron, 58 ans — Directeur d'usine\nRetraite anticipée envisagée: à 60 ans\nRevenu: 88 000 $/an | REER: 210 000 $ | CELI: 42 000 $\nProfil investisseur: Prudent-modéré (signé 2021)",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'c2',
        text: "RECOMMANDATION (mars 2024) — Réallocation complète du REER:\n1. Fonds de capital-investissement privé (illiquide, horizon minimum 10 ans) — 50 %\n2. Obligations de sociétés à rendement élevé (BB-) — 30 %\n3. FNB de cryptomonnaies diversifiées — 20 %",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Un investisseur prudent-modéré à 58 ans visant la retraite à 60 ans ne doit pas avoir 50 % de son REER dans des produits illiquides sur 10 ans (inaccessibles à la retraite), ni 20 % en cryptomonnaies. Cette répartition est fondamentalement incompatible avec le profil et les besoins déclarés.",
      },
      {
        id: 'c3',
        text: "MISE À JOUR DU PROFIL:\nLe conseiller a indiqué que le profil de 2021 était « toujours valide » sans procéder à une mise à jour formelle. Aucun nouveau questionnaire n'a été rempli lors de cette réunion de mars 2024.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Un profil investisseur doit être mis à jour lors de tout changement significatif — la proximité de la retraite (2 ans) en est un. Utiliser un profil vieux de 3 ans sans vérification est contraire aux bonnes pratiques.",
      },
      {
        id: 'c4',
        text: "FRAIS DES PRODUITS:\nFonds capital-investissement: 2,1 %/an + intéressement de 15 % sur les gains\nObligations haut rendement: 1,3 % intégrés\nFNB crypto: 1,8 % de gestion\nAucune illustration des frais cumulatifs sur 10 ans n'a été fournie.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Le conseiller est tenu de présenter une illustration des coûts totaux sur la durée prévue (notamment l'intéressement de 15 % qui peut représenter des sommes importantes). L'absence de cette illustration empêche un consentement véritablement éclairé.",
      },
      {
        id: 'c5',
        text: "RÉMUNÉRATION ET AFFILIATIONS:\nLes trois produits sont gérés par des partenaires affiliés à la firme.\nCommissions totales estimées: 8 400 $ sur le premier placement.\nCette relation d'affiliation a été mentionnée dans le document d'ouverture de compte signé en 2018.",
        isViolation: true,
        violationType: 'conflit',
        explanation: "Le conflit d'intérêts lié aux partenaires affiliés doit être divulgué explicitement lors de chaque recommandation, pas uniquement dans le document d'ouverture de compte signé 6 ans auparavant.",
      },
      {
        id: 'c6',
        text: "OBJECTIFS FINANCIERS (tels que notés par le conseiller):\n\"Le client cherche à optimiser le rendement de son REER avant la retraite. Il accepte une certaine volatilité pour atteindre ses objectifs.\"\nNote: ces objectifs ont été reformulés par le conseiller après la réunion.",
        isViolation: true,
        violationType: 'manipulation',
        explanation: "Reformuler les objectifs du client après la réunion (sans sa révision ni sa signature) pour les faire correspondre aux produits vendus est une manipulation documentaire. Les objectifs doivent être validés par le client.",
      },
      {
        id: 'c7',
        text: "CONSENTEMENT:\nLe client a signé le formulaire d'autorisation le 22 mars 2024.\nLe conseiller a conservé une copie signée.",
        isViolation: false,
        explanation: '',
      },
    ],
  },

  // ══ DIFFICULTÉ 3 ══════════════════════════════════════════════════════════════
  {
    id: 'beaumont',
    title: 'Dossier Beaumont — Audit intégral',
    context: 'Dossier complexe: violations subtiles. Chaque manquement doit être identifié ET catégorisé.',
    difficulty: 3,
    timeLimit: 160,
    blocks: [
      {
        id: 'bm1',
        text: "FICHE CLIENT\nNom: Sophie Beaumont, 47 ans — Architecte\nRevenu: 115 000 $/an | Actif net: 380 000 $\nProfil investisseur: Croissance-agressive (questionnaire signé le 3 juin 2022)\nObjectifs: maximiser la croissance, horizon 15 ans",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Le questionnaire date de juin 2022 — il a plus de 22 mois. Les lignes directrices exigent une mise à jour tous les 12-18 mois ou lors d'un changement de situation. Utiliser un profil périmé invalide la base de la recommandation.",
      },
      {
        id: 'bm2',
        text: "TRANSACTION DU 9 AVRIL 2024:\nAchat: 75 000 $ de billets à capital protégé liés à un indice propriétaire\nÉmetteur: Banque Nordique Internationale (Îles Caïman)\nProtection du capital: 100 % à l'échéance (12 ans)\nPotentiel de gain plafonné: 35 % total sur 12 ans",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'bm3',
        text: "FRAIS ET RÉMUNÉRATION:\nFrais de structuration intégrés: 3,8 % (non apparents dans la documentation remise au client)\nFrais de suivi annuels: 0,5 % sur le capital\nCommission du conseiller: 2,1 % à la vente\nCes frais réduisent le rendement net potentiel de 12 % sur 12 ans.",
        isViolation: true,
        violationType: 'omission',
        explanation: "Les frais de structuration de 3,8 % « intégrés et non apparents » constituent une omission matérielle. Tout frais impactant significativement le rendement doit être divulgué explicitement.",
      },
      {
        id: 'bm4',
        text: "RELATION AVEC L'ÉMETTEUR:\nLa firme du conseiller a participé à la structuration de ce billet.\nUne entente de distribution exclusive a été conclue entre la firme et Banque Nordique en janvier 2024.\nAucune mention de cette relation n'apparaît dans le document de recommandation remis à la cliente.",
        isViolation: true,
        violationType: 'conflit',
        explanation: "La participation à la structuration + entente de distribution exclusive créent un conflit d'intérêts majeur devant figurer explicitement dans le document de recommandation.",
      },
      {
        id: 'bm5',
        text: "ÉVALUATION DE LA COMPRÉHENSION:\nNote interne du superviseur (non transmise à la cliente): \"Client ne semble pas saisir que le gain est plafonné à 35 % et que le capital 'protégé' est sujet au risque de crédit de l'émetteur. À surveiller.\"\nLe conseiller a néanmoins procédé à la vente.",
        isViolation: true,
        violationType: 'manipulation',
        explanation: "Procéder à une vente alors que le superviseur a noté l'incompréhension du client sur des caractéristiques essentielles du produit est une violation grave de l'obligation d'agir dans l'intérêt du client.",
      },
      {
        id: 'bm6',
        text: "FINANCEMENT:\nLa cliente a utilisé une marge de crédit hypothécaire (HELOC) de 75 000 $ à 7,2 % d'intérêt annuel pour financer cet investissement.\nLe conseiller a indiqué que « l'intérêt est potentiellement déductible ».",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Financer un produit à rendement plafonné 35 % sur 12 ans avec une dette à 7,2 %/an est économiquement irrationnel — le coût de financement (~86 % sur 12 ans) excède le gain potentiel. L'affirmation sur la déductibilité fiscale est trop vague sans analyse formelle.",
      },
      {
        id: 'bm7',
        text: "APPROBATION SUPERVISEUR:\nSuperviseur désigné: M. Lacroix\nDate d'approbation: 10 avril 2024\nLa transaction a été exécutée le 9 avril, avant l'obtention de l'approbation du superviseur.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "L'approbation superviseur est requise AVANT l'exécution d'une transaction complexe. Exécuter le 9 avril et obtenir l'approbation le 10 inverse l'ordre requis par les procédures réglementaires.",
      },
    ],
  },

  {
    id: 'hebert',
    title: 'Dossier Hébert — Gestion discrétionnaire',
    context: 'Portefeuille en gestion discrétionnaire. Six irrégularités à identifier et catégoriser.',
    difficulty: 3,
    timeLimit: 160,
    blocks: [
      {
        id: 'h1',
        text: "CONTEXTE\nNom: Rémi Hébert, 54 ans — Médecin spécialiste\nMandat: Gestion discrétionnaire depuis 2019\nActif sous gestion: 1 240 000 $\nStratégie convenue: Équilibrée (50 % revenu fixe / 50 % actions)",
        isViolation: false,
        explanation: '',
      },
      {
        id: 'h2',
        text: "ACTIVITÉ DU COMPTE — T1 2024:\n47 transactions réalisées (vs 12 au T1 2023 et 9 au T1 2022)\nFrais de transaction générés: 28 400 $\nRendement du portefeuille sur la période: –1,2 %\nIndice de référence équilibré sur la même période: +4,8 %",
        isViolation: true,
        violationType: 'manipulation',
        explanation: "Le volume de transactions a été multiplié par ~5, générant 28 400 $ de commissions pour un résultat de –1,2 % contre +4,8 % pour l'indice. Ce profil correspond à du « churning » — opérations excessives destinées à générer des commissions — infraction grave.",
      },
      {
        id: 'h3',
        text: "REMPLACEMENT OBLIGATAIRE (janvier 2024):\nLe gestionnaire a vendu l'ensemble des obligations gouvernementales détenues (rendement 4,1 %) pour les remplacer par des obligations de sociétés notées BBB (rendement 5,2 %).\nNote: \"Amélioration du rendement dans l'intérêt du client.\"",
        isViolation: true,
        violationType: 'inadapte',
        explanation: "Remplacer des obligations gouvernementales (sécuritaires) par des BBB (risque de crédit plus élevé) dépasse la stratégie équilibrée convenue. Ce changement de profil de risque aurait dû être approuvé explicitement par le client.",
      },
      {
        id: 'h4',
        text: "TRANSACTION DU 14 FÉVRIER 2024:\nAchat de 85 000 $ d'actions de Technova Inc. (société privée non cotée)\nSource de la décision: note d'analyste interne datée du 12 fév. (non publiée publiquement)\nLa société a annoncé un contrat gouvernemental majeur le 20 février (+43 % en 6 jours)",
        isViolation: true,
        violationType: 'manipulation',
        explanation: "Acheter des titres 6 jours avant une annonce majeure sur la base d'une note interne non publiée constitue potentiellement une utilisation d'information privilégiée (délit d'initié) — déclaration immédiate au responsable conformité requise.",
      },
      {
        id: 'h5',
        text: "DOCUMENTATION DES DÉCISIONS:\nLe registre de gestion discrétionnaire ne contient pas de justification documentée pour 31 des 47 transactions du trimestre.\nLes politiques internes exigent une justification écrite pour chaque transaction.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "L'absence de justification pour 66 % des transactions rend impossible tout contrôle de conformité rétrospectif — obligation fondamentale en gestion discrétionnaire.",
      },
      {
        id: 'h6',
        text: "COMMUNICATION CLIENT:\nDernière réunion de suivi: septembre 2023\nLe mandat prévoit des réunions trimestrielles et un rapport semestriel.\nAucun rapport semestriel n'a été produit depuis celui de juin 2022.",
        isViolation: true,
        violationType: 'documentation',
        explanation: "Le non-respect des obligations contractuelles (réunions trimestrielles, rapports semestriels) constitue une violation du mandat et des obligations envers le client.",
      },
      {
        id: 'h7',
        text: "RAPPORT ANNUEL DE RENDEMENT 2023:\nRendement déclaré: +6,2 %\nVérification interne: ce calcul inclut des dépôts effectués en cours d'année comme des \"gains\", faussant la performance réelle de +1,8 % (méthode pondérée par l'argent).",
        isViolation: true,
        violationType: 'fausse_declaration',
        explanation: "Inclure des dépôts entrants dans le calcul du rendement pour gonfler artificiellement la performance est une fausse déclaration. La norme impose la méthode pondérée dans le temps (time-weighted return).",
      },
    ],
  },
]

// ─── Composant ─────────────────────────────────────────────────────────────────

export default function DetectivePage() {
  const [phase, setPhase]               = useState<Phase>('intro')
  const [difficulty, setDifficulty]     = useState<Difficulty>(1)
  const [currentCase, setCurrentCase]   = useState<Case | null>(null)
  // Map: blockId → ViolationType | null (null = flagged, no type yet)
  const [flags, setFlags]               = useState<Map<string, ViolationType | null>>(new Map())
  const [typeSelector, setTypeSelector] = useState<string | null>(null)
  const [timeLeft, setTimeLeft]         = useState(0)
  const [reviewing, setReviewing]       = useState(false)
  const [hintsLeft, setHintsLeft]       = useState(0)
  const [hintPulse, setHintPulse]       = useState<string | null>(null)
  const [branchColor, setBranchColor]   = useState('#D4A843')
  const [result, setResult]             = useState<{
    xp: number; coins: number; levelUp: boolean
    breakdown?: import('@/lib/xp-calculator').BonusBreakdown
    rankUp?: { name: string; bonusCoins: number; bonusXP: number } | null
  } | null>(null)
  const [unlocked, setUnlocked] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || reviewing || timeLeft <= 0) return
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, reviewing, timeLeft])

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (phase === 'playing' && !reviewing && timeLeft === 0 && currentCase) {
      handleFinish()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  function startGame() {
    const pool = CASES.filter(c => c.difficulty === difficulty)
    const picked = pool[Math.floor(Math.random() * pool.length)]
    setCurrentCase(picked)
    setFlags(new Map())
    setTypeSelector(null)
    setTimeLeft(picked.timeLimit)
    setReviewing(false)
    setHintsLeft(DIFF_CONFIG[difficulty].hintCount)
    setHintPulse(null)
    setPhase('playing')
  }

  function toggleFlag(blockId: string) {
    if (reviewing) return
    setFlags(prev => {
      const next = new Map(prev)
      if (next.has(blockId)) {
        next.delete(blockId)
        if (typeSelector === blockId) setTypeSelector(null)
      } else {
        next.set(blockId, null)
        if (difficulty === 3) setTypeSelector(blockId)
      }
      return next
    })
  }

  function assignType(blockId: string, type: ViolationType) {
    setFlags(prev => { const n = new Map(prev); n.set(blockId, type); return n })
    setTypeSelector(null)
  }

  function useHint() {
    if (!currentCase || hintsLeft === 0) return
    const unfound = currentCase.blocks.filter(b => b.isViolation && !flags.has(b.id))
    if (unfound.length === 0) return
    const pick = unfound[Math.floor(Math.random() * unfound.length)]
    setHintPulse(pick.id)
    setHintsLeft(h => h - 1)
    setTimeout(() => setHintPulse(null), 3500)
  }

  const handleFinish = useCallback(async () => {
    if (!currentCase || reviewing) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setReviewing(true)

    const violations    = currentCase.blocks.filter(b => b.isViolation)
    const truePositives = violations.filter(v => flags.has(v.id)).length
    const falsePositives = [...flags.keys()].filter(id =>
      !currentCase.blocks.find(b => b.id === id)?.isViolation
    ).length

    const score      = Math.max(0, Math.round((truePositives / violations.length) * 100 - falsePositives * 15))
    const timePct    = Math.max(0, (timeLeft) / currentCase.timeLimit)
    const elapsed    = currentCase.timeLimit - timeLeft

    // Wait for review animation
    await new Promise(r => setTimeout(r, 2800))

    const res  = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_type: 'detective', score,
        questions_total: violations.length, questions_correct: truePositives,
        best_streak: 0, avg_time_seconds: elapsed,
        difficulty, time_bonus_pct: timePct,
      }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false, breakdown: data.bonus_breakdown, rankUp: data.rank_up_reward })
    if (data.achievements_unlocked?.length) setUnlocked(data.achievements_unlocked)
    setTimeout(() => setPhase('result'), 400)
  }, [currentCase, reviewing, flags, timeLeft, difficulty])

  // ── Rendu du timer ────────────────────────────────────────────────────────────
  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const timerColor = !currentCase ? '#25C292'
    : timeLeft > currentCase.timeLimit * 0.5 ? '#25C292'
    : timeLeft > currentCase.timeLimit * 0.2 ? '#D4A843'
    : '#FF4D6A'

  // ── Score preview (live) ──────────────────────────────────────────────────────
  function liveScore() {
    if (!currentCase) return { tp: 0, fp: 0, total: 0 }
    const total = currentCase.blocks.filter(b => b.isViolation).length
    const tp    = [...flags.keys()].filter(id => currentCase.blocks.find(b => b.id === id)?.isViolation).length
    const fp    = [...flags.keys()].length - tp
    return { tp, fp, total }
  }

  // ── Block status (during review) ─────────────────────────────────────────────
  function blockStatus(block: Block): 'correct' | 'false_positive' | 'missed' | 'neutral' {
    if (!reviewing) return 'neutral'
    const flagged = flags.has(block.id)
    if (block.isViolation && flagged)  return 'correct'
    if (!block.isViolation && flagged) return 'false_positive'
    if (block.isViolation && !flagged) return 'missed'
    return 'neutral'
  }

  const live = currentCase ? liveScore() : { tp: 0, fp: 0, total: 0 }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <GameShell title="Le Régulateur" icon="🔍" branchColor={branchColor}>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔍</div>
            <h1 className="font-cinzel text-2xl font-bold text-white mb-2">Le Régulateur</h1>
            <p className="text-gray-400 text-sm">
              Analysez un dossier réglementaire et identifiez les infractions cachées.
              Aucun indice visuel — vous lisez comme un vrai inspecteur AMF.
            </p>
          </div>

          <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-4">Choisir un niveau</p>

          <div className="space-y-3 mb-8">
            {([1, 2, 3] as Difficulty[]).map(d => {
              const cfg = DIFF_CONFIG[d]
              const selected = difficulty === d
              return (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="w-full p-4 rounded-xl text-left transition-all border"
                  style={{
                    background: selected ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                    borderColor: selected ? `${cfg.color}60` : 'rgba(255,255,255,0.08)',
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-cinzel"
                      style={{ background: `${cfg.color}25`, color: cfg.color }}>
                      {d}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{cfg.label}</p>
                      <p className="text-gray-500 text-xs">{cfg.desc}</p>
                    </div>
                    {selected && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: cfg.color }} />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="rpg-card p-4 mb-6 text-xs text-gray-400 space-y-1">
            <p>📋 Cliquez sur un bloc de texte pour le <strong className="text-white">marquer comme suspect</strong>.</p>
            <p>❌ Cliquez à nouveau pour retirer le marquage.</p>
            {difficulty === 3 && <p>🏷 Niveau Expert: vous devez aussi <strong className="text-white">catégoriser</strong> chaque infraction.</p>}
            <p>⚠ Chaque fausse alarme pénalise votre score de 15 points.</p>
          </div>

          <button onClick={startGame}
            className="w-full py-4 rounded-xl font-cinzel font-bold tracking-wider uppercase text-sm transition-all"
            style={{ background: `linear-gradient(135deg, ${DIFF_CONFIG[difficulty].color}, ${DIFF_CONFIG[difficulty].color}99)`, color: '#080A12' }}>
            Commencer l'audit
          </button>
        </div>
      )}

      {/* ── JEU ── */}
      {phase === 'playing' && currentCase && (
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{DIFF_CONFIG[difficulty].label}</p>
              <h2 className="font-cinzel font-bold text-white text-sm truncate">{currentCase.title}</h2>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
              {/* Hints */}
              {hintsLeft > 0 && !reviewing && (
                <button onClick={useHint}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{ borderColor: '#4D8BFF40', color: '#4D8BFF', background: '#4D8BFF15' }}>
                  💡 Indice ({hintsLeft})
                </button>
              )}
              {/* Flag count */}
              <div className="text-right">
                <p className="text-xs font-semibold" style={{ color: branchColor }}>
                  {live.tp}/{live.total} suspectes
                </p>
                {live.fp > 0 && <p className="text-xs text-red-400">–{live.fp} fausse{live.fp > 1 ? 's' : ''}</p>}
              </div>
              {/* Timer */}
              <div className="text-right">
                <p className="font-cinzel text-xl font-bold tabular-nums transition-colors" style={{ color: timerColor }}>
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          </div>

          {/* Context */}
          <div className="mb-4 px-4 py-2 rounded-lg text-xs text-gray-400 border"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            {currentCase.context}
          </div>

          {/* Document blocks */}
          <div className="space-y-2 mb-4">
            {currentCase.blocks.map(block => {
              const flagged  = flags.has(block.id)
              const status   = blockStatus(block)
              const isPulse  = hintPulse === block.id
              const showType = typeSelector === block.id

              const borderColor =
                status === 'correct'        ? '#25C292' :
                status === 'false_positive' ? '#FF4D6A' :
                status === 'missed'         ? '#F59E0B' :
                isPulse                     ? '#4D8BFF' :
                flagged                     ? branchColor :
                'rgba(255,255,255,0.07)'

              const bgColor =
                status === 'correct'        ? 'rgba(37,194,146,0.08)'  :
                status === 'false_positive' ? 'rgba(255,77,106,0.08)'  :
                status === 'missed'         ? 'rgba(245,158,11,0.08)'  :
                isPulse                     ? 'rgba(77,139,255,0.12)'  :
                flagged                     ? `${branchColor}10`       :
                'rgba(255,255,255,0.02)'

              return (
                <div key={block.id}>
                  <div
                    onClick={() => toggleFlag(block.id)}
                    className="rounded-xl p-4 cursor-pointer transition-all select-none relative"
                    style={{
                      border: `1.5px solid ${borderColor}`,
                      background: bgColor,
                      animationName: isPulse ? 'hintPulse' : undefined,
                    }}>

                    {/* Status icon (review) */}
                    {status !== 'neutral' && (
                      <span className="absolute top-3 right-3 text-sm">
                        {status === 'correct'        ? '✓' :
                         status === 'false_positive' ? '✗' : '!'}
                      </span>
                    )}

                    {/* Flag indicator */}
                    {flagged && !reviewing && (
                      <span className="absolute top-3 right-3 text-xs font-bold" style={{ color: branchColor }}>⚑</span>
                    )}

                    <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                      {block.text}
                    </pre>

                    {/* Type badge (if assigned) */}
                    {flagged && flags.get(block.id) && (
                      <div className="mt-2">
                        {(() => {
                          const vt = VIOLATION_TYPES.find(v => v.key === flags.get(block.id))
                          return vt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: `${vt.color}20`, color: vt.color, border: `1px solid ${vt.color}40` }}>
                              🏷 {vt.label}
                            </span>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Review explanation */}
                    {reviewing && (status === 'correct' || status === 'missed') && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {block.explanation}
                        </p>
                        {block.violationType && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: `${(VIOLATION_TYPES.find(v => v.key === block.violationType)?.color ?? '#fff')}20`, color: VIOLATION_TYPES.find(v => v.key === block.violationType)?.color }}>
                            {VIOLATION_TYPES.find(v => v.key === block.violationType)?.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Type selector (difficulty 3) */}
                  {showType && !reviewing && (
                    <div className="mt-1 p-3 rounded-xl border border-white/10 bg-[#0d1117]">
                      <p className="text-xs text-gray-400 mb-2">Catégoriser cette infraction :</p>
                      <div className="flex flex-wrap gap-2">
                        {VIOLATION_TYPES.map(vt => (
                          <button key={vt.key}
                            onClick={e => { e.stopPropagation(); assignType(block.id, vt.key) }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                            style={{ color: vt.color, background: `${vt.color}15`, borderColor: `${vt.color}40` }}>
                            {vt.label}
                          </button>
                        ))}
                        <button onClick={e => { e.stopPropagation(); setTypeSelector(null) }}
                          className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-white/10 hover:text-white transition-all">
                          Plus tard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Submit */}
          {!reviewing && (
            <div className="flex gap-3">
              <button onClick={handleFinish}
                className="flex-1 py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider uppercase transition-all"
                style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12' }}>
                Soumettre le rapport ({flags.size} bloc{flags.size > 1 ? 's' : ''} marqué{flags.size > 1 ? 's' : ''})
              </button>
            </div>
          )}

          {reviewing && (
            <div className="rpg-card p-4 text-center animate-pulse">
              <p className="text-gray-400 text-sm">Analyse du rapport en cours…</p>
            </div>
          )}
        </div>
      )}

      {/* ── RÉSULTAT ── */}
      {phase === 'result' && result && currentCase && (() => {
        const violations = currentCase.blocks.filter(b => b.isViolation)
        const tp = violations.filter(v => flags.has(v.id)).length
        const fp = [...flags.keys()].filter(id => !currentCase.blocks.find(b => b.id === id)?.isViolation).length
        const score = Math.max(0, Math.round((tp / violations.length) * 100 - fp * 15))
        return (
          <ResultScreen
            score={score} correct={tp} total={violations.length}
            xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
            bonusBreakdown={result.breakdown} rankUpReward={result.rankUp}
            branchColor={branchColor} gameLabel="Le Régulateur"
            onReplay={() => { setFlags(new Map()); setReviewing(false); setPhase('intro') }}
          />
        )
      })()}

      <AchievementUnlockToast achievements={unlocked} onDone={() => setUnlocked([])} />

      <style>{`
        @keyframes hintPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(77,139,255,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(77,139,255,0); }
        }
      `}</style>
    </GameShell>
  )
}
