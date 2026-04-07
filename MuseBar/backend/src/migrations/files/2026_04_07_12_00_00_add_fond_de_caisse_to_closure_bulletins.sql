-- UP
-- Add "fond de caisse" (cash float) to closure bulletins.
-- Informational field: does not affect totals, only stored for audit reference.
ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS fond_de_caisse DECIMAL(12,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN closure_bulletins.fond_de_caisse IS 'Fond de caisse (cash float) left in the register at closure time; informational only';

-- DOWN
ALTER TABLE closure_bulletins
  DROP COLUMN IF EXISTS fond_de_caisse;

