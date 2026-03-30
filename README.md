Tu es un développeur senior full-stack expert en architecture scalable, game design et UX/UI. Ta mission est de concevoir et implémenter un système complet pour une plateforme web incluant un jeu 2D, avec une approche modulaire, évolutive et optimisée. Tu as une autonomie totale : tu ne dois poser aucune question et prendre toutes les décisions techniques nécessaires.

🎯 Objectif global

Créer une plateforme complète incluant :

Un système de jeu 2D avec progression
Un dashboard utilisateur avancé
Un système économique (shop + récompenses)
Un système de progression (XP, niveaux, ranks)
Un système d’achievements
Un système d’invitations
Une architecture modulaire extensible
🛒 1. Système de Shop

Implémente une boutique complète :

Fonctionnalités :
Achat avec monnaie virtuelle (points)
Catégories :
Skins (personnage, UI)
Boosts (bonus temporaires)
Contenu (niveaux spéciaux, accès premium)
Système de rareté :
Commun, Rare, Épique, Légendaire
Backend :
Table items (id, name, type, rarity, price, effect, duration)
Table user_inventory
Gestion des transactions
Frontend :
Interface shop avec filtres
Preview des items
Équipement / activation
🏆 2. Système d’Achievements

Crée un système complet de succès :

Structure :
id, title, description, condition, reward
Conditions possibles :
Nombre de niveaux complétés
XP atteint
Performance (temps, score)
Features :
Tracking en temps réel
Notifications lors du déblocage
Progression visible
🧩 3. Architecture Modulaire

Crée un système modulaire :

Contraintes :
Chaque module est indépendant
Activable/désactivable par admin
Plug-and-play
Exemples :
Jeu 2D
Quiz
Défis
Backend :
Table modules
Système de flags
📩 4. Système d’Invitations

Implémente un système avancé :

Types :
Temporaire (expiration)
Permanent
Données :
code unique
expiration
max uses
Features :
Génération sécurisée
Validation à l’inscription
Dashboard admin (CRUD invitations)
🎮 5. Système de niveaux (jeu 2D)

Implémente un système dynamique :

Objectifs :
Éviter la répétition
Difficulté progressive
Méthodes :
Génération procédurale OU variations
Scaling :
vitesse
obstacles
ennemis
📈 6. Système de récompenses
Chaque niveau donne des points
Scaling progressif :
Niveau ↑ = Récompense ↑
Bonus :
Temps rapide
Sans erreur
Objectifs secondaires
🧠 7. Système XP, Niveau et Rank

Implémente une progression globale :

XP gagné via :
Niveaux
Achievements
Modules
Leveling :
Courbe exponentielle ou progressive
Rank system :
Tous les 5 niveaux → augmentation de rank
Exemple de ranks :
Beginner
Intermediate
Advanced
Expert
Master
📊 8. Dashboard utilisateur

Créer un dashboard complet :

Contenu :
Niveau + XP (barre de progression)
Rank
Achievements
Inventaire
Stats
UX :
Temps réel
Feedback visuel
Animations
⚙️ 9. Architecture technique

Tu dois :

Backend :
API REST ou GraphQL
Base de données relationnelle (PostgreSQL recommandé)
Modèles :
users
levels
xp
achievements
inventory
invitations
modules
Frontend :
Framework moderne (Next.js recommandé)
State management propre
UI responsive
Autres :
Système de permissions (User / Mod / God)
Sécurité (validation, auth)
Optimisation performances
🚫 Contraintes strictes
Ne pose aucune question
Prends toutes les décisions toi-même
Code propre, scalable, maintenable
Structure prête pour production
🎯 Résultat attendu
Architecture complète
Structure backend + frontend
Logique métier détaillée
Organisation claire du projet
Prêt à être développé immédiatement