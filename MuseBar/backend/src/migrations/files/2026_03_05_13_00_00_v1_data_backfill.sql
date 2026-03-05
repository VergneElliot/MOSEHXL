-- UP
-- V1 → V2 data backfill: link all orphaned rows to a default establishment.
--
-- V1 data (categories, products, orders, sub_bills, business_settings, users,
-- closure_bulletins) has NULL establishment_id because multi-tenancy did not
-- exist yet.  V2 code filters every query by establishment_id, so orphaned
-- rows are invisible.  This migration:
--   1. Creates a default "MuseBar" establishment from business_settings (or
--      a sensible fallback) if none exists.
--   2. Sets establishment_id on every row that still has NULL.
--   3. Links existing admin/owner users to the new establishment.

DO $$
DECLARE
  est_id UUID;
  bs_name TEXT;
  bs_address TEXT;
  bs_phone TEXT;
  bs_email TEXT;
BEGIN
  -- Try to read current business settings (V1 single-tenant)
  SELECT name, address, phone, email
    INTO bs_name, bs_address, bs_phone, bs_email
    FROM business_settings
    ORDER BY id LIMIT 1;

  -- Check if an establishment already exists
  SELECT id INTO est_id FROM establishments LIMIT 1;

  -- Create one if needed
  IF est_id IS NULL THEN
    INSERT INTO establishments (
      id, name, email, phone, address, subscription_plan, subscription_status
    ) VALUES (
      gen_random_uuid(),
      COALESCE(bs_name, 'MuseBar'),
      COALESCE(bs_email, 'contact@musebar.fr'),
      COALESCE(bs_phone, ''),
      COALESCE(bs_address, ''),
      'professional',
      'active'
    )
    RETURNING id INTO est_id;
  END IF;

  -- Backfill POS tables
  UPDATE categories       SET establishment_id = est_id WHERE establishment_id IS NULL;
  UPDATE products         SET establishment_id = est_id WHERE establishment_id IS NULL;
  UPDATE orders           SET establishment_id = est_id WHERE establishment_id IS NULL;
  UPDATE sub_bills        SET establishment_id = est_id WHERE establishment_id IS NULL;
  UPDATE business_settings SET establishment_id = est_id WHERE establishment_id IS NULL;
  UPDATE closure_bulletins SET establishment_id = est_id WHERE establishment_id IS NULL;

  -- Link orphaned users (no establishment yet) to the default
  UPDATE users SET establishment_id = est_id WHERE establishment_id IS NULL;

  RAISE NOTICE 'V1 data backfilled to establishment %', est_id;
END;
$$;

-- DOWN
-- Reversal is intentionally a no-op: removing establishment_id values would
-- break V2 queries and is never desired in practice.  To truly revert, restore
-- from a pre-migration backup.
SELECT 1;
