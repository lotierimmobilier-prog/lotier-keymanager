ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS email_api_key TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT;
