ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS notification_email TEXT;
