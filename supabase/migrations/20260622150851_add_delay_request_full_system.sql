ALTER TABLE key_movements
  ADD COLUMN IF NOT EXISTS delay_requested_new_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_request_status TEXT,
  ADD COLUMN IF NOT EXISTS delay_response_message TEXT,
  ADD COLUMN IF NOT EXISTS delay_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_responded_by UUID;
