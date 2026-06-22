/*
  # Ajout de formats de référence par type de bien

  1. Objectif
    - Permettre des formats de référence différents selon le type de bien (gestion, location, vente, syndic)
    - Ajouter des compteurs séparés pour chaque type

  2. Changements
    - Ajoute des colonnes pour les patterns de référence par type
    - Ajoute des compteurs séparés pour chaque type
    - Conserve le pattern par défaut pour la rétrocompatibilité

  3. Nouveaux champs
    - property_reference_pattern_gestion (TEXT)
    - property_reference_pattern_location (TEXT)
    - property_reference_pattern_vente (TEXT)
    - property_reference_pattern_syndic (TEXT)
    - property_counter_gestion (INTEGER)
    - property_counter_location (INTEGER)
    - property_counter_vente (INTEGER)
    - property_counter_syndic (INTEGER)
*/

-- Ajouter les colonnes pour les patterns par type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_reference_pattern_gestion'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_reference_pattern_gestion TEXT DEFAULT '{owner_name:3}-GES-{counter:3}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_reference_pattern_location'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_reference_pattern_location TEXT DEFAULT '{owner_name:3}-LOC-{counter:3}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_reference_pattern_vente'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_reference_pattern_vente TEXT DEFAULT '{owner_name:3}-VTE-{counter:3}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_reference_pattern_syndic'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_reference_pattern_syndic TEXT DEFAULT '{owner_name:3}-SYN-{counter:3}';
  END IF;
END $$;

-- Ajouter les colonnes pour les compteurs par type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_counter_gestion'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_counter_gestion INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_counter_location'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_counter_location INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_counter_vente'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_counter_vente INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_settings' AND column_name = 'property_counter_syndic'
  ) THEN
    ALTER TABLE agency_settings ADD COLUMN property_counter_syndic INTEGER DEFAULT 0;
  END IF;
END $$;

-- Mettre à jour la fonction generate_property_reference pour supporter les types
CREATE OR REPLACE FUNCTION generate_property_reference(
  p_agency_id UUID,
  p_owner_name TEXT,
  p_owner_first_name TEXT DEFAULT '',
  p_address TEXT DEFAULT '',
  p_type TEXT DEFAULT 'APPARTEMENT'
)
RETURNS TEXT AS $$
DECLARE
  v_pattern TEXT;
  v_counter INTEGER;
  v_result TEXT;
  v_type_lower TEXT;
  v_counter_field TEXT;
BEGIN
  -- Normaliser le type en minuscules
  v_type_lower := LOWER(TRIM(p_type));

  -- Récupérer le pattern et le compteur selon le type
  IF v_type_lower = 'gestion' THEN
    SELECT property_reference_pattern_gestion, property_counter_gestion
    INTO v_pattern, v_counter
    FROM agency_settings
    WHERE agency_id = p_agency_id;
    v_counter_field := 'property_counter_gestion';
  ELSIF v_type_lower = 'location' THEN
    SELECT property_reference_pattern_location, property_counter_location
    INTO v_pattern, v_counter
    FROM agency_settings
    WHERE agency_id = p_agency_id;
    v_counter_field := 'property_counter_location';
  ELSIF v_type_lower = 'vente' THEN
    SELECT property_reference_pattern_vente, property_counter_vente
    INTO v_pattern, v_counter
    FROM agency_settings
    WHERE agency_id = p_agency_id;
    v_counter_field := 'property_counter_vente';
  ELSIF v_type_lower = 'syndic' THEN
    SELECT property_reference_pattern_syndic, property_counter_syndic
    INTO v_pattern, v_counter
    FROM agency_settings
    WHERE agency_id = p_agency_id;
    v_counter_field := 'property_counter_syndic';
  ELSE
    -- Type par défaut (APPARTEMENT, MAISON, etc.)
    SELECT property_reference_pattern, property_counter
    INTO v_pattern, v_counter
    FROM agency_settings
    WHERE agency_id = p_agency_id;
    v_counter_field := 'property_counter';
  END IF;

  -- Si pas de settings, utiliser le format par défaut
  IF v_pattern IS NULL THEN
    v_pattern := '{owner_name:3}-{address:3}-{counter:3}';
    v_counter := 0;
  END IF;

  -- Incrémenter le compteur approprié
  v_counter := v_counter + 1;

  -- Mettre à jour le compteur
  EXECUTE format(
    'UPDATE agency_settings SET %I = $1 WHERE agency_id = $2',
    v_counter_field
  ) USING v_counter, p_agency_id;

  -- Générer la référence
  v_result := v_pattern;
  v_result := REGEXP_REPLACE(v_result, '\{owner_name:(\d+)\}', UPPER(LEFT(p_owner_name, SUBSTRING(v_result FROM '\{owner_name:(\d+)\}')::INTEGER)), 'g');
  v_result := REGEXP_REPLACE(v_result, '\{owner_first_name:(\d+)\}', UPPER(LEFT(p_owner_first_name, SUBSTRING(v_result FROM '\{owner_first_name:(\d+)\}')::INTEGER)), 'g');
  v_result := REGEXP_REPLACE(v_result, '\{address:(\d+)\}', UPPER(LEFT(p_address, SUBSTRING(v_result FROM '\{address:(\d+)\}')::INTEGER)), 'g');
  v_result := REGEXP_REPLACE(v_result, '\{type:(\d+)\}', UPPER(LEFT(p_type, SUBSTRING(v_result FROM '\{type:(\d+)\}')::INTEGER)), 'g');
  v_result := REGEXP_REPLACE(v_result, '\{counter:(\d+)\}', LPAD(v_counter::TEXT, SUBSTRING(v_result FROM '\{counter:(\d+)\}')::INTEGER, '0'), 'g');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
