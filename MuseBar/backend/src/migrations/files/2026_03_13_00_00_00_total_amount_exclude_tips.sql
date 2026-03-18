-- UP
-- total_amount must be base TTC (sum of items), never including tips.
-- Backfill from order_items for all non-change orders so CA and cancellations are correct.
UPDATE orders o
SET
  total_amount = sub.sum_total,
  total_tax = sub.sum_tax
FROM (
  SELECT order_id, SUM(total_price) AS sum_total, SUM(tax_amount) AS sum_tax
  FROM order_items
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id
  AND (o.operation_type IS NULL OR o.operation_type <> 'change');

-- DOWN
-- No-op: cannot restore previous total_amount/total_tax.
