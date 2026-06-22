/*
  # Ajout du suivi de durée pour les prestataires

  1. Modifications
    - Ajout de `provider_expected_start_at` (date de début prévue)
    - Ajout de `provider_expected_end_at` (date de fin prévue)
    - Ces champs permettent aux administrateurs de définir la période prévue pendant laquelle
      les prestataires vont conserver les clés

  2. Notes importantes
    - Les champs sont nullable car ils ne s'appliquent qu'aux sorties pour prestataires
    - Pour les collaborateurs, on continue d'utiliser `out_at` et `expected_return_at`
    - Ces champs aident à mieux planifier et suivre les durées de conservation par les prestataires
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'provider_expected_start_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_expected_start_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'provider_expected_end_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_expected_end_at timestamptz;
  END IF;
END $$;
