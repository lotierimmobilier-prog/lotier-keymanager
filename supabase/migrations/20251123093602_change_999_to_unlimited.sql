/*
  # Changement de 999 à une valeur illimitée réelle

  1. Modifications
    - Mise à jour du plan Enterprise : 999 → 999999999 clés
    - Mise à jour de toutes les subscriptions Enterprise
    - Mise à jour de toutes les agences Enterprise

  2. Raison
    - Représentation plus claire du concept "illimité"
    - Évite toute confusion avec une vraie limite de 999 clés
*/

-- Mettre à jour le plan Enterprise
UPDATE plans 
SET included_keys = 999999999
WHERE name = 'Enterprise' AND included_keys = 999;

-- Mettre à jour les subscriptions qui ont 999 comme limite
UPDATE subscriptions
SET current_keys_limit = 999999999
WHERE current_keys_limit = 999;

-- Mettre à jour les agences qui ont 999 comme limite
UPDATE agencies
SET max_keys = 999999999
WHERE max_keys = 999;
