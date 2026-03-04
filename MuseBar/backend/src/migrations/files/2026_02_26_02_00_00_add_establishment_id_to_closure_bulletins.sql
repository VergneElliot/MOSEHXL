-- UP
-- Add establishment_id to closure_bulletins so each bulletin is scoped to one establishment
-- (multi-tenant legal closure: no mixing of orders across establishments)
ALTER TABLE closure_bulletins
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_closure_bulletins_establishment_id ON closure_bulletins(establishment_id);
CREATE INDEX IF NOT EXISTS idx_closure_bulletins_type_period_establishment
  ON closure_bulletins(closure_type, period_start, establishment_id);

-- DOWN
DROP INDEX IF EXISTS idx_closure_bulletins_type_period_establishment;
DROP INDEX IF EXISTS idx_closure_bulletins_establishment_id;
ALTER TABLE closure_bulletins DROP COLUMN IF EXISTS establishment_id;
