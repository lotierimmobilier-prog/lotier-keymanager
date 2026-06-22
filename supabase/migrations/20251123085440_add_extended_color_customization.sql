/*
  # Ajout de colonnes de personnalisation étendues

  1. Modifications
    - Ajoute `accent_color` à la table `agencies` pour les badges et notifications
    - Ajoute `sidebar_bg` à la table `agencies` pour le fond de la barre latérale
    - Ajoute `sidebar_text` à la table `agencies` pour le texte de la barre latérale
    - Valeurs par défaut respectivement : '#F59E0B', '#1E293B', '#F1F5F9'

  2. Notes
    - Ces couleurs permettront une personnalisation complète de l'interface
    - Les couleurs sont stockées au format hexadécimal (#RRGGBB)
*/

-- Ajouter la colonne accent_color
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'accent_color'
  ) THEN
    ALTER TABLE agencies ADD COLUMN accent_color text DEFAULT '#F59E0B';
  END IF;
END $$;

-- Ajouter la colonne sidebar_bg
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'sidebar_bg'
  ) THEN
    ALTER TABLE agencies ADD COLUMN sidebar_bg text DEFAULT '#1E293B';
  END IF;
END $$;

-- Ajouter la colonne sidebar_text
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'sidebar_text'
  ) THEN
    ALTER TABLE agencies ADD COLUMN sidebar_text text DEFAULT '#F1F5F9';
  END IF;
END $$;
