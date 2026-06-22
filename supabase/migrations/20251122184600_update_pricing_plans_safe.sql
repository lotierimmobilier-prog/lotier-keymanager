/*
  # Mise à jour des plans tarifaires

  1. Modifications
    - Gratuit : 1 à 3 clés
    - Starter : 4 à 10 clés - 7,99€
    - Growth : 11 à 20 clés - 14,99€
    - Professional : 21 à 50 clés - 29,99€
    - Enterprise : 51+ clés - 59,99€

  2. Notes importantes
    - Mise à jour des plans existants sans les supprimer
    - Les paliers sont définis par `included_keys` (nombre max de clés)
    - Ajout du plan Growth manquant
*/

DO $$
DECLARE
  free_plan_id uuid;
  starter_plan_id uuid;
  growth_plan_id uuid;
  professional_plan_id uuid;
  enterprise_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'Free' LIMIT 1;
  SELECT id INTO starter_plan_id FROM plans WHERE name = 'Starter' LIMIT 1;
  SELECT id INTO professional_plan_id FROM plans WHERE name = 'Professional' LIMIT 1;
  SELECT id INTO enterprise_plan_id FROM plans WHERE name = 'Enterprise' LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    UPDATE plans SET 
      name = 'Gratuit',
      included_keys = 3,
      base_price = 0.00,
      extra_step = 0,
      extra_price = 0.00
    WHERE id = free_plan_id;
  ELSE
    INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price)
    VALUES ('Gratuit', 3, 0.00, 0, 0.00);
  END IF;

  IF starter_plan_id IS NOT NULL THEN
    UPDATE plans SET 
      included_keys = 10,
      base_price = 7.99,
      extra_step = 0,
      extra_price = 0.00
    WHERE id = starter_plan_id;
  ELSE
    INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price)
    VALUES ('Starter', 10, 7.99, 0, 0.00);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Growth') THEN
    INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price)
    VALUES ('Growth', 20, 14.99, 0, 0.00);
  ELSE
    UPDATE plans SET 
      included_keys = 20,
      base_price = 14.99,
      extra_step = 0,
      extra_price = 0.00
    WHERE name = 'Growth';
  END IF;

  IF professional_plan_id IS NOT NULL THEN
    UPDATE plans SET 
      included_keys = 50,
      base_price = 29.99,
      extra_step = 0,
      extra_price = 0.00
    WHERE id = professional_plan_id;
  ELSE
    INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price)
    VALUES ('Professional', 50, 29.99, 0, 0.00);
  END IF;

  IF enterprise_plan_id IS NOT NULL THEN
    UPDATE plans SET 
      included_keys = 999,
      base_price = 59.99,
      extra_step = 0,
      extra_price = 0.00
    WHERE id = enterprise_plan_id;
  ELSE
    INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price)
    VALUES ('Enterprise', 999, 59.99, 0, 0.00);
  END IF;
END $$;
