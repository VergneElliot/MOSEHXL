-- UP
-- Fix NaN values in financial columns introduced by previous bugs.
-- PostgreSQL DECIMAL/NUMERIC can store NaN, which breaks aggregations and stats.
UPDATE orders
SET
  total_amount = 0,
  total_tax = 0
WHERE
  total_amount::text = 'NaN'
  OR total_tax::text = 'NaN';

-- DOWN
-- No-op: data cleanup is not reversible.

