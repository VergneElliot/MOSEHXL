-- ============================================================
-- Migration: Accounting and tax decimal precision (exact values)
-- ============================================================
-- Why: In France, displayed prices are TTC. Tax is derived from
-- TTC (taxAmount = totalPrice * taxRate / (1 + taxRate)). Storing
-- only 2 decimals forces rounding per line; summing rounded values
-- causes drift in week/month/year closures. For legal compliance,
-- we store exact amounts in the DB and round only for UI/display.
-- ============================================================

-- UP

-- Orders: total_amount and total_tax with 4 decimal places
ALTER TABLE orders
  ALTER COLUMN total_amount TYPE DECIMAL(12,4) USING total_amount::DECIMAL(12,4),
  ALTER COLUMN total_tax    TYPE DECIMAL(12,4) USING total_tax::DECIMAL(12,4);

-- Order items: unit_price, total_price, tax_amount
ALTER TABLE order_items
  ALTER COLUMN unit_price   TYPE DECIMAL(12,4) USING unit_price::DECIMAL(12,4),
  ALTER COLUMN total_price  TYPE DECIMAL(12,4) USING total_price::DECIMAL(12,4),
  ALTER COLUMN tax_amount   TYPE DECIMAL(12,4) USING tax_amount::DECIMAL(12,4);

-- Sub-bills: amount (for split payments)
ALTER TABLE sub_bills
  ALTER COLUMN amount TYPE DECIMAL(12,4) USING amount::DECIMAL(12,4);

-- Legal journal: amount and vat_amount (fiscal records)
ALTER TABLE legal_journal
  ALTER COLUMN amount    TYPE DECIMAL(12,4) USING amount::DECIMAL(12,4),
  ALTER COLUMN vat_amount TYPE DECIMAL(12,4) USING vat_amount::DECIMAL(12,4);

-- Closure bulletins: total_amount and total_vat (period totals)
ALTER TABLE closure_bulletins
  ALTER COLUMN total_amount TYPE DECIMAL(12,4) USING total_amount::DECIMAL(12,4),
  ALTER COLUMN total_vat    TYPE DECIMAL(12,4) USING total_vat::DECIMAL(12,4);

-- Orders tips/change (optional; keep 2 decimals is fine for display-origin)
-- Leaving as DECIMAL(10,2) is acceptable; only tax and sale amounts need exact precision.

-- DOWN
-- Revert to 2 decimal places (rounds stored values; use only if rolling back)
ALTER TABLE orders
  ALTER COLUMN total_amount TYPE DECIMAL(10,2) USING ROUND(total_amount::numeric, 2),
  ALTER COLUMN total_tax    TYPE DECIMAL(10,2) USING ROUND(total_tax::numeric, 2);
ALTER TABLE order_items
  ALTER COLUMN unit_price   TYPE DECIMAL(10,2) USING ROUND(unit_price::numeric, 2),
  ALTER COLUMN total_price  TYPE DECIMAL(10,2) USING ROUND(total_price::numeric, 2),
  ALTER COLUMN tax_amount   TYPE DECIMAL(10,2) USING ROUND(tax_amount::numeric, 2);
ALTER TABLE sub_bills
  ALTER COLUMN amount TYPE DECIMAL(10,2) USING ROUND(amount::numeric, 2);
ALTER TABLE legal_journal
  ALTER COLUMN amount     TYPE DECIMAL(10,2) USING ROUND(amount::numeric, 2),
  ALTER COLUMN vat_amount TYPE DECIMAL(10,2) USING ROUND(vat_amount::numeric, 2);
ALTER TABLE closure_bulletins
  ALTER COLUMN total_amount TYPE DECIMAL(12,2) USING ROUND(total_amount::numeric, 2),
  ALTER COLUMN total_vat    TYPE DECIMAL(12,2) USING ROUND(total_vat::numeric, 2);
