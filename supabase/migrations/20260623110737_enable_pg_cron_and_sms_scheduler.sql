-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Supprimer le job s'il existe déjà (pour éviter les doublons)
SELECT cron.unschedule('sms-scheduler') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sms-scheduler'
);

-- Créer le job planifié toutes les 10 minutes
SELECT cron.schedule(
  'sms-scheduler',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://fdmsoawnwsasskoxpqgy.supabase.co/functions/v1/sms-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbXNvYXdud3Nhc3Nrb3hwcWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODg2NjUsImV4cCI6MjA3ODc2NDY2NX0.gtg6xGVDGkBZtBbJOKdeoT23rREUSg4IRlkmrBI1sb4'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
