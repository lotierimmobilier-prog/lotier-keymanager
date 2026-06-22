/*
  # Correction de la fonction generate_property_reference

  1. Problème
    - La fonction retournait NULL à cause d'une mauvaise extraction des nombres dans les patterns
    - Les REGEXP_REPLACE avec SUBSTRING ne fonctionnaient pas correctement

  2. Solution
    - Réécriture de la logique de remplacement des variables
    - Extraction correcte des longueurs depuis les patterns
    - Gestion propre des cas où les valeurs sont NULL

  3. Tests
    - Pattern : {owner_name:3}-GES-{counter:3}
    - Résultat attendu : DUP-GES-001
*/

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
  v_length INTEGER;
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
  v_counter := COALESCE(v_counter, 0) + 1;

  -- Mettre à jour le compteur
  EXECUTE format(
    'UPDATE agency_settings SET %I = $1 WHERE agency_id = $2',
    v_counter_field
  ) USING v_counter, p_agency_id;

  -- Générer la référence en remplaçant chaque variable
  v_result := v_pattern;

  -- Remplacer {owner_name:X}
  WHILE v_result ~ '\{owner_name:\d+\}' LOOP
    v_length := (regexp_match(v_result, '\{owner_name:(\d+)\}'))[1]::INTEGER;
    v_result := regexp_replace(v_result, '\{owner_name:\d+\}', UPPER(LEFT(COALESCE(p_owner_name, ''), v_length)), '');
  END LOOP;

  -- Remplacer {owner_first_name:X}
  WHILE v_result ~ '\{owner_first_name:\d+\}' LOOP
    v_length := (regexp_match(v_result, '\{owner_first_name:(\d+)\}'))[1]::INTEGER;
    v_result := regexp_replace(v_result, '\{owner_first_name:\d+\}', UPPER(LEFT(COALESCE(p_owner_first_name, ''), v_length)), '');
  END LOOP;

  -- Remplacer {address:X}
  WHILE v_result ~ '\{address:\d+\}' LOOP
    v_length := (regexp_match(v_result, '\{address:(\d+)\}'))[1]::INTEGER;
    v_result := regexp_replace(v_result, '\{address:\d+\}', UPPER(LEFT(COALESCE(p_address, ''), v_length)), '');
  END LOOP;

  -- Remplacer {type:X}
  WHILE v_result ~ '\{type:\d+\}' LOOP
    v_length := (regexp_match(v_result, '\{type:(\d+)\}'))[1]::INTEGER;
    v_result := regexp_replace(v_result, '\{type:\d+\}', UPPER(LEFT(COALESCE(p_type, ''), v_length)), '');
  END LOOP;

  -- Remplacer {counter:X}
  WHILE v_result ~ '\{counter:\d+\}' LOOP
    v_length := (regexp_match(v_result, '\{counter:(\d+)\}'))[1]::INTEGER;
    v_result := regexp_replace(v_result, '\{counter:\d+\}', LPAD(v_counter::TEXT, v_length, '0'), '');
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
