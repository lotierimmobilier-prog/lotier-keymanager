/*
  # Add Complete Site Content

  This migration adds comprehensive default content for all public pages
  to make them fully editable through the admin panel.

  ## Content Added
  - Homepage sections (hero, features, testimonials, cta, footer)
  - Features page content
  - Pricing page content
  - Blog page content
*/

-- Delete existing content to avoid conflicts
DELETE FROM public.site_content_sections;

-- Homepage Content
INSERT INTO public.site_content_sections (page, section_key, title, content, display_order) VALUES

-- Homepage Hero
('homepage', 'hero', 'Hero Section', '{
  "badge": "🎉 Nouveau : Alertes SMS automatiques !",
  "title": "Plus jamais de clés perdues 🔑",
  "subtitle": "La solution ultra-simple pour gérer vos clés immobilières. Traçabilité magique, alertes automatiques et équipe synchronisée !",
  "ctaPrimary": "Essayer gratuitement",
  "ctaSecondary": "Voir la magie ✨",
  "badges": [
    {"icon": "check", "text": "100% gratuit"},
    {"icon": "shield", "text": "Sécurisé"},
    {"icon": "clock", "text": "Setup en 2 min"}
  ],
  "stats": [
    {"value": "98%", "label": "De satisfaction 🎊"},
    {"value": "500+", "label": "Agences"}
  ]
}'::jsonb, 1),

-- Homepage Features
('homepage', 'features', 'Features Section', '{
  "badge": "✨ SUPER POUVOIRS",
  "title": "Pourquoi c''est génial ?",
  "subtitle": "Des fonctionnalités qui vont vous faire gagner des heures chaque semaine",
  "features": [
    {
      "icon": "key",
      "title": "Gestion centralisée 🎯",
      "description": "Toutes vos clés en un clic. Codes d''accès, statuts en temps réel. Simple et efficace !",
      "color": "amber"
    },
    {
      "icon": "file",
      "title": "Traçabilité magique 🔍",
      "description": "Qui a pris quoi ? Quand ? Pourquoi ? Tout est tracé automatiquement. Zéro effort !",
      "color": "green"
    },
    {
      "icon": "bell",
      "title": "Alertes SMS 📱",
      "description": "Notifications automatiques en cas de retard. Ne perdez plus jamais vos clés !",
      "color": "orange"
    },
    {
      "icon": "users",
      "title": "Équipe synchronisée 👥",
      "description": "Rôles et permissions pour toute votre équipe. Tout le monde est dans la boucle !",
      "color": "blue"
    }
  ]
}'::jsonb, 2),

-- Homepage Testimonials
('homepage', 'testimonials', 'Testimonials Section', '{
  "badge": "⭐ TÉMOIGNAGES",
  "title": "Ils sont fans ! 🤩",
  "subtitle": "Des milliers d''agences conquises",
  "testimonials": [
    {
      "rating": 5,
      "text": "KeyManager a transformé notre façon de travailler. Plus de clés perdues ! Tout est tracé. C''est magique ! 🪄",
      "author": "Marie Dubois",
      "role": "Directrice, Agence ImmoParis",
      "image": "https://images.pexels.com/photos/3760514/pexels-photo-3760514.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
    },
    {
      "rating": 5,
      "text": "Gain de temps incroyable ! Les alertes automatiques nous évitent les oublis. Toute l''équipe adore ! 🚀",
      "author": "Thomas Martin",
      "role": "Manager, Century Sud",
      "image": "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
    },
    {
      "rating": 5,
      "text": "La traçabilité est un vrai plus. En cas de litige, on retrouve tout en 2 clics. Indispensable ! 💯",
      "author": "Sophie Laurent",
      "role": "Responsable, Foncia Lyon",
      "image": "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
    }
  ]
}'::jsonb, 3),

-- Homepage CTA
('homepage', 'cta', 'Call to Action', '{
  "badge": "🎉 Offre de lancement !",
  "title": "Prêt à révolutionner votre gestion des clés ?",
  "subtitle": "Rejoignez plus de 500 agences immobilières qui ont déjà simplifié leur quotidien avec KeyManager",
  "ctaPrimary": "Commencer gratuitement",
  "ctaSecondary": "Voir les tarifs",
  "features": [
    "✨ 100% gratuit",
    "🚀 Sans engagement",
    "⚡ Setup en 2 minutes"
  ]
}'::jsonb, 4),

-- Features Page
('features', 'hero', 'Hero Section', '{
  "title": "Fonctionnalités Complètes",
  "subtitle": "Découvrez tous les outils pour simplifier votre gestion quotidienne"
}'::jsonb, 1),

('features', 'features_list', 'Features List', '{
  "features": [
    {
      "title": "Gestion des Clés",
      "description": "Système complet de suivi et gestion de vos clés",
      "details": [
        "Création de références uniques",
        "Statut en temps réel (disponible/sortie)",
        "Association aux propriétés",
        "Photos et descriptions"
      ]
    },
    {
      "title": "Suivi des Mouvements",
      "description": "Historique détaillé de tous les mouvements",
      "details": [
        "Qui a pris quelle clé",
        "Date et heure de sortie",
        "Date de retour prévue",
        "Alertes de retard"
      ]
    },
    {
      "title": "Gestion Multi-Agences",
      "description": "Parfait pour les groupes d''agences",
      "details": [
        "Isolation des données par agence",
        "Gestion des utilisateurs et rôles",
        "Personnalisation par agence",
        "Statistiques consolidées"
      ]
    },
    {
      "title": "Alertes SMS",
      "description": "Notifications automatiques intelligentes",
      "details": [
        "Rappels avant échéance",
        "Alertes de retard",
        "Notifications personnalisées",
        "Configuration flexible"
      ]
    },
    {
      "title": "Gestion des Contacts",
      "description": "Base de données complète",
      "details": [
        "Propriétaires et locataires",
        "Artisans et prestataires",
        "Historique des interactions",
        "Import/Export CSV"
      ]
    },
    {
      "title": "Reporting & Analytics",
      "description": "Statistiques détaillées",
      "details": [
        "Taux d''utilisation",
        "Clés les plus demandées",
        "Performance de l''équipe",
        "Export des rapports"
      ]
    }
  ]
}'::jsonb, 2),

-- Pricing Page
('pricing', 'hero', 'Hero Section', '{
  "title": "Choisissez votre forfait",
  "subtitle": "Des plans adaptés à chaque besoin"
}'::jsonb, 1),

('pricing', 'features', 'Pricing Features', '{
  "note": "Tous les plans incluent: Support par email, Mises à jour gratuites, Données sécurisées",
  "commonFeatures": [
    "Support par email",
    "Mises à jour gratuites",
    "Données sécurisées",
    "Gestion des clés illimitée",
    "Historique complet",
    "Application mobile"
  ]
}'::jsonb, 2),

-- Blog Page
('blog', 'hero', 'Hero Section', '{
  "title": "Actualités et Conseils",
  "subtitle": "Restez informé des dernières nouveautés et découvrez nos conseils d''experts"
}'::jsonb, 1);
