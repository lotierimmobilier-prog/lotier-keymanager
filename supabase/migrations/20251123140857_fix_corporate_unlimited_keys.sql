/*
  # Correction du plan Corporate - Clés illimitées

  1. Modifications
    - Change la valeur de `included_keys` pour le plan Corporate de 999999999 à -1
    - La valeur -1 sera utilisée dans le code pour représenter "illimité"
    - Plus propre et plus facile à gérer

  2. Notes
    - L'affichage "Clés illimitées" sera géré côté frontend
    - Aucun impact sur les fonctionnalités existantes
*/

-- Mettre à jour le plan Corporate pour utiliser -1 au lieu de 999999999
UPDATE plans 
SET included_keys = -1 
WHERE name = 'Corporate';
