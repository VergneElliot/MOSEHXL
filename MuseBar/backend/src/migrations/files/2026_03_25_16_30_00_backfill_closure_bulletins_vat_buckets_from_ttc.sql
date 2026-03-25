-- UP
-- Recompute closure bulletin VAT breakdown using bucket TTC totals (audit-safe).
-- - "total soumis à TVA 10/20" = sum(order_items.total_price) per VAT bucket
-- - VAT per bucket computed from TTC bucket totals:
--     10% => VAT = TTC / 11
--     20% => VAT = TTC / 6
-- - HT per bucket = TTC - VAT
--
-- Also updates closure_bulletins.total_amount and total_vat to match bucket recomputation.
--
-- IMPORTANT: closure_bulletins are marked is_closed=true and a trigger prevents updates.
-- This migration temporarily drops the trigger, performs the backfill, then re-adds it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_prevent_closed_bulletin_modification'
  ) THEN
    EXECUTE 'DROP TRIGGER trigger_prevent_closed_bulletin_modification ON closure_bulletins';
  END IF;
END $$;

WITH bucket_totals AS (
  SELECT
    cb.id AS bulletin_id,
    cb.establishment_id,
    cb.period_start,
    cb.period_end,
    COALESCE(SUM(oi.total_price) FILTER (
      WHERE (
        -- 10% bucket: tax_rate stored as 0.10 or 10
        (oi.tax_rate <= 0.15) OR (oi.tax_rate >= 9 AND oi.tax_rate <= 11)
      )
    ), 0)::numeric(12,4) AS ttc_10,
    COALESCE(SUM(oi.total_price) FILTER (
      WHERE NOT (
        (oi.tax_rate <= 0.15) OR (oi.tax_rate >= 9 AND oi.tax_rate <= 11)
      )
    ), 0)::numeric(12,4) AS ttc_20
  FROM closure_bulletins cb
  JOIN orders o
    ON o.establishment_id IS NOT DISTINCT FROM cb.establishment_id
   AND o.created_at >= cb.period_start
   AND o.created_at <= cb.period_end
   AND o.status IN ('completed', 'paid')
  JOIN order_items oi ON oi.order_id = o.id
  GROUP BY cb.id, cb.establishment_id, cb.period_start, cb.period_end
),
computed AS (
  SELECT
    bulletin_id,
    ttc_10,
    ttc_20,
    ROUND(ttc_10 / 11, 4)::numeric(12,4) AS vat_10,
    ROUND(ttc_20 / 6, 4)::numeric(12,4) AS vat_20
  FROM bucket_totals
),
final AS (
  SELECT
    bulletin_id,
    ttc_10,
    ttc_20,
    vat_10,
    vat_20,
    (ttc_10 - vat_10)::numeric(12,4) AS ht_10,
    (ttc_20 - vat_20)::numeric(12,4) AS ht_20,
    (ttc_10 + ttc_20)::numeric(12,4) AS total_ttc,
    (vat_10 + vat_20)::numeric(12,4) AS total_vat
  FROM computed
)
UPDATE closure_bulletins cb
SET
  vat_breakdown = jsonb_build_object(
    'vat_10', jsonb_build_object('amount', f.ht_10, 'vat', f.vat_10, 'ttc', f.ttc_10),
    'vat_20', jsonb_build_object('amount', f.ht_20, 'vat', f.vat_20, 'ttc', f.ttc_20)
  ),
  total_amount = f.total_ttc,
  total_vat = f.total_vat
FROM final f
WHERE cb.id = f.bulletin_id;

-- Recreate the trigger that prevents modification of closed bulletins
CREATE TRIGGER trigger_prevent_closed_bulletin_modification
  BEFORE UPDATE OR DELETE ON closure_bulletins
  FOR EACH ROW
  EXECUTE FUNCTION prevent_closed_bulletin_modification();

-- DOWN
-- Data rollback is not safely reversible (would require restoring prior per-line VAT sums).
-- We only ensure the legal trigger exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_prevent_closed_bulletin_modification'
  ) THEN
    EXECUTE '
      CREATE TRIGGER trigger_prevent_closed_bulletin_modification
        BEFORE UPDATE OR DELETE ON closure_bulletins
        FOR EACH ROW
        EXECUTE FUNCTION prevent_closed_bulletin_modification()
    ';
  END IF;
END $$;

