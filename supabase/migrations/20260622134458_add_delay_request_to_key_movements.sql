ALTER TABLE key_movements
  ADD COLUMN IF NOT EXISTS delay_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_request_message TEXT;