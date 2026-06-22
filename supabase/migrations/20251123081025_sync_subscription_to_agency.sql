/*
  # Synchronisation Subscription vers Agency

  1. Objectif
    - Créer un trigger qui synchronise automatiquement les changements de subscriptions vers la table agencies
    - Assure la cohérence entre les deux tables pour max_keys et plan_id

  2. Changements
    - Crée une fonction trigger qui met à jour agencies.max_keys quand subscriptions.current_keys_limit change
    - Crée une fonction trigger qui met à jour agencies.plan_id quand subscriptions.plan_id change
    - Ajoute le trigger sur les opérations INSERT et UPDATE de subscriptions

  3. Avantages
    - Cohérence automatique des données
    - Pas de code dupliqué côté frontend
    - Source de vérité unique (subscriptions)

  Note: Ce trigger s'exécute APRÈS l'insert/update pour éviter les problèmes de contraintes
*/

-- Fonction pour synchroniser subscription vers agency
CREATE OR REPLACE FUNCTION sync_subscription_to_agency()
RETURNS TRIGGER AS $$
BEGIN
  -- Met à jour max_keys et plan_id de l'agence
  UPDATE agencies
  SET 
    max_keys = NEW.current_keys_limit,
    plan_id = NEW.plan_id
  WHERE id = NEW.agency_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprime le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_sync_subscription_to_agency ON subscriptions;

-- Crée le trigger sur INSERT et UPDATE
CREATE TRIGGER trigger_sync_subscription_to_agency
  AFTER INSERT OR UPDATE OF current_keys_limit, plan_id
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_agency();
