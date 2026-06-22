/*
  # Fix Reference Generation Function

  1. Changes
    - Fix the regexp_replace backreference issue in generate_property_reference
    - Replace problematic backreferences with direct substring calls
    - Fix the invalid input syntax error for integer type
    
  2. Details
    - The issue was using '\1' as a backreference in substring() which PostgreSQL interprets as a string literal
    - Solution: Parse the number from the pattern and use it directly
*/

CREATE OR REPLACE FUNCTION generate_property_reference(
  p_agency_id uuid,
  p_owner_name text,
  p_owner_first_name text,
  p_address text,
  p_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pattern text;
  v_counter integer;
  v_reference text;
  v_clean_text text;
BEGIN
  -- Get the pattern and increment counter
  SELECT property_reference_pattern, property_counter + 1
  INTO v_pattern, v_counter
  FROM agency_settings
  WHERE agency_id = p_agency_id;

  -- If no settings exist, create default
  IF v_pattern IS NULL THEN
    INSERT INTO agency_settings (agency_id)
    VALUES (p_agency_id)
    ON CONFLICT (agency_id) DO NOTHING;
    
    v_pattern := '{owner_name:3}-{address:3}-{counter:3}';
    v_counter := 1;
  END IF;

  -- Update counter
  UPDATE agency_settings
  SET property_counter = v_counter
  WHERE agency_id = p_agency_id;

  -- Build reference from pattern
  v_reference := v_pattern;
  
  -- Replace owner_name variables
  IF v_reference ~ '\{owner_name:\d+\}' THEN
    v_clean_text := upper(regexp_replace(p_owner_name, '[^a-zA-Z]', '', 'g'));
    v_reference := regexp_replace(v_reference, '\{owner_name:(\d+)\}', 
      substring(v_clean_text, 1, (regexp_match(v_reference, '\{owner_name:(\d+)\}'))[1]::integer));
  END IF;
  
  -- Replace owner_first_name variables
  IF v_reference ~ '\{owner_first_name:\d+\}' THEN
    v_clean_text := upper(regexp_replace(coalesce(p_owner_first_name, ''), '[^a-zA-Z]', '', 'g'));
    v_reference := regexp_replace(v_reference, '\{owner_first_name:(\d+)\}', 
      substring(v_clean_text, 1, (regexp_match(v_reference, '\{owner_first_name:(\d+)\}'))[1]::integer));
  END IF;
  
  -- Replace address variables
  IF v_reference ~ '\{address:\d+\}' THEN
    v_clean_text := upper(regexp_replace(p_address, '[^a-zA-Z]', '', 'g'));
    v_reference := regexp_replace(v_reference, '\{address:(\d+)\}', 
      substring(v_clean_text, 1, (regexp_match(v_reference, '\{address:(\d+)\}'))[1]::integer));
  END IF;
  
  -- Replace type variables
  IF v_reference ~ '\{type:\d+\}' THEN
    v_clean_text := upper(regexp_replace(p_type, '[^a-zA-Z]', '', 'g'));
    v_reference := regexp_replace(v_reference, '\{type:(\d+)\}', 
      substring(v_clean_text, 1, (regexp_match(v_reference, '\{type:(\d+)\}'))[1]::integer));
  END IF;
  
  -- Replace counter variables
  v_reference := replace(v_reference, '{counter:3}', lpad(v_counter::text, 3, '0'));
  v_reference := replace(v_reference, '{counter:2}', lpad(v_counter::text, 2, '0'));
  v_reference := replace(v_reference, '{counter:4}', lpad(v_counter::text, 4, '0'));

  RETURN v_reference;
END;
$$;
