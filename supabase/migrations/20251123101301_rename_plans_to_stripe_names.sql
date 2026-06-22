/*
  # Renommer les plans pour correspondre aux noms Stripe

  1. Modifications
    - Gratuit → Gratuit (inchangé, plan gratuit)
    - Starter (10 clés - 7,99€) → Team
    - Growth (20 clés - 14,99€) → Business
    - Professional (50 clés - 29,99€) → Business+
    - Enterprise (illimité - 59,99€) → Corporate

  2. Raison
    - Correspondance avec les noms des produits Stripe
    - Cohérence entre l'interface et Stripe Dashboard
*/

-- Renommer les plans pour correspondre aux noms Stripe
UPDATE plans SET name = 'Team' WHERE name = 'Starter' AND base_price = 7.99;
UPDATE plans SET name = 'Business' WHERE name = 'Growth' AND base_price = 14.99;
UPDATE plans SET name = 'Business+' WHERE name = 'Professional' AND base_price = 29.99;
UPDATE plans SET name = 'Corporate' WHERE name = 'Enterprise' AND base_price = 59.99;
