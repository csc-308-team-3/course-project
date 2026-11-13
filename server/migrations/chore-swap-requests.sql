BEGIN;

ALTER TABLE swap_requests
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE swap_requests
  DROP CONSTRAINT IF EXISTS swap_requests_status_check;

ALTER TABLE swap_requests
  ADD CONSTRAINT swap_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS swap_requests_one_pending_per_instance_idx
  ON swap_requests (chore_instance_id)
  WHERE status = 'pending';

COMMIT;
