-- UP
-- B2: add denormalized establishment_id on order_items (defense in depth).
-- Data safety: no destructive deletes. Migration fails closed if unresolved rows remain.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES establishments(id) ON DELETE RESTRICT;

UPDATE order_items oi
SET establishment_id = o.establishment_id
FROM orders o
WHERE oi.order_id = o.id
  AND oi.establishment_id IS NULL;

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM order_items
  WHERE establishment_id IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION
      'B2 migration halted: % order_items rows have no establishment_id after backfill. No rows were deleted; investigate parent order linkage before retry.',
      missing_count;
  END IF;
END
$$;

ALTER TABLE order_items
  ALTER COLUMN establishment_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_establishment_id ON order_items(establishment_id);

-- DOWN
DROP INDEX IF EXISTS idx_order_items_establishment_id;
ALTER TABLE order_items DROP COLUMN IF EXISTS establishment_id;

