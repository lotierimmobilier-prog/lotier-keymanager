/*
  # Ajout du champ service_type aux biens et clés

  1. Modifications
    - Ajoute la colonne `service_type` à la table `properties`
    - Ajoute la colonne `service_type` à la table `keys`
    - Valeurs possibles: 'GESTION', 'LOCATION', 'VENTE', 'SYNDIC', 'AUTRE'
    - Valeur par défaut: 'AUTRE'
    - Met à jour les biens existants basés sur leur type actuel

  2. Notes
    - Les biens avec type 'Gestion', 'Location', 'Vente' ou 'Syndic' seront marqués avec le service_type correspondant
    - Les autres types (Appartement, Maison, etc.) auront 'AUTRE'
    - Les clés hériteront du service_type de leur bien associé
*/

-- Ajouter la colonne service_type à properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE properties 
    ADD COLUMN service_type text DEFAULT 'AUTRE' CHECK (service_type IN ('GESTION', 'LOCATION', 'VENTE', 'SYNDIC', 'AUTRE'));
  END IF;
END $$;

-- Ajouter la colonne service_type à keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE keys 
    ADD COLUMN service_type text DEFAULT 'AUTRE' CHECK (service_type IN ('GESTION', 'LOCATION', 'VENTE', 'SYNDIC', 'AUTRE'));
  END IF;
END $$;

-- Mettre à jour les biens existants basés sur leur type
UPDATE properties
SET service_type = CASE
  WHEN type = 'Gestion' THEN 'GESTION'
  WHEN type = 'Location' THEN 'LOCATION'
  WHEN type = 'Vente' THEN 'VENTE'
  WHEN type = 'Syndic' THEN 'SYNDIC'
  ELSE 'AUTRE'
END
WHERE service_type = 'AUTRE';

-- Mettre à jour les clés existantes pour hériter du service_type de leur bien
UPDATE keys k
SET service_type = p.service_type
FROM properties p
WHERE k.property_id = p.id
AND k.service_type = 'AUTRE';
