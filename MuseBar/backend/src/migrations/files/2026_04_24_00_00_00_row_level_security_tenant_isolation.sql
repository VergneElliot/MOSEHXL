-- UP
-- B1: Row Level Security tenant isolation (shared-table multi-tenancy).

CREATE OR REPLACE FUNCTION app_current_establishment_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.establishment_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_rls_bypass()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.bypass_rls', true), ''), 'off') = 'on'
$$;

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS orders_tenant_select ON public.orders;
    DROP POLICY IF EXISTS orders_tenant_write ON public.orders;

    CREATE POLICY orders_tenant_select ON public.orders
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY orders_tenant_write ON public.orders
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS order_items_tenant_select ON public.order_items;
    DROP POLICY IF EXISTS order_items_tenant_write ON public.order_items;

    CREATE POLICY order_items_tenant_select ON public.order_items
      FOR SELECT
      USING (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = order_items.order_id
              AND o.establishment_id = app_current_establishment_id()
          )
        )
      );

    CREATE POLICY order_items_tenant_write ON public.order_items
      FOR ALL
      USING (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = order_items.order_id
              AND o.establishment_id = app_current_establishment_id()
          )
        )
      )
      WITH CHECK (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.id = order_items.order_id
              AND o.establishment_id = app_current_establishment_id()
          )
        )
      );
  END IF;

  IF to_regclass('public.sub_bills') IS NOT NULL THEN
    ALTER TABLE public.sub_bills ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sub_bills FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS sub_bills_tenant_select ON public.sub_bills;
    DROP POLICY IF EXISTS sub_bills_tenant_write ON public.sub_bills;

    CREATE POLICY sub_bills_tenant_select ON public.sub_bills
      FOR SELECT
      USING (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND (
            establishment_id = app_current_establishment_id()
            OR EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id = sub_bills.order_id
                AND o.establishment_id = app_current_establishment_id()
            )
          )
        )
      );

    CREATE POLICY sub_bills_tenant_write ON public.sub_bills
      FOR ALL
      USING (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND (
            establishment_id = app_current_establishment_id()
            OR EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id = sub_bills.order_id
                AND o.establishment_id = app_current_establishment_id()
            )
          )
        )
      )
      WITH CHECK (
        app_rls_bypass()
        OR (
          app_current_establishment_id() IS NOT NULL
          AND (
            establishment_id = app_current_establishment_id()
            OR EXISTS (
              SELECT 1
              FROM public.orders o
              WHERE o.id = sub_bills.order_id
                AND o.establishment_id = app_current_establishment_id()
            )
          )
        )
      );
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS products_tenant_select ON public.products;
    DROP POLICY IF EXISTS products_tenant_write ON public.products;

    CREATE POLICY products_tenant_select ON public.products
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY products_tenant_write ON public.products
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS categories_tenant_select ON public.categories;
    DROP POLICY IF EXISTS categories_tenant_write ON public.categories;

    CREATE POLICY categories_tenant_select ON public.categories
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY categories_tenant_write ON public.categories
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.closure_bulletins') IS NOT NULL THEN
    ALTER TABLE public.closure_bulletins ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.closure_bulletins FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS closure_bulletins_tenant_select ON public.closure_bulletins;
    DROP POLICY IF EXISTS closure_bulletins_tenant_write ON public.closure_bulletins;

    CREATE POLICY closure_bulletins_tenant_select ON public.closure_bulletins
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY closure_bulletins_tenant_write ON public.closure_bulletins
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.closure_settings') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'closure_settings'
         AND column_name = 'establishment_id'
     ) THEN
    ALTER TABLE public.closure_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.closure_settings FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS closure_settings_tenant_select ON public.closure_settings;
    DROP POLICY IF EXISTS closure_settings_tenant_write ON public.closure_settings;

    CREATE POLICY closure_settings_tenant_select ON public.closure_settings
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY closure_settings_tenant_write ON public.closure_settings
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.legal_journal') IS NOT NULL THEN
    ALTER TABLE public.legal_journal ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.legal_journal FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS legal_journal_tenant_select ON public.legal_journal;
    DROP POLICY IF EXISTS legal_journal_tenant_write ON public.legal_journal;

    CREATE POLICY legal_journal_tenant_select ON public.legal_journal
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY legal_journal_tenant_write ON public.legal_journal
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.archive_exports') IS NOT NULL THEN
    ALTER TABLE public.archive_exports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.archive_exports FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS archive_exports_tenant_select ON public.archive_exports;
    DROP POLICY IF EXISTS archive_exports_tenant_write ON public.archive_exports;

    CREATE POLICY archive_exports_tenant_select ON public.archive_exports
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY archive_exports_tenant_write ON public.archive_exports
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;

  IF to_regclass('public.audit_trail') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'audit_trail'
         AND column_name = 'establishment_id'
     ) THEN
    ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_trail FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS audit_trail_tenant_select ON public.audit_trail;
    DROP POLICY IF EXISTS audit_trail_tenant_write ON public.audit_trail;

    CREATE POLICY audit_trail_tenant_select ON public.audit_trail
      FOR SELECT
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));

    CREATE POLICY audit_trail_tenant_write ON public.audit_trail
      FOR ALL
      USING (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()))
      WITH CHECK (app_rls_bypass() OR (app_current_establishment_id() IS NOT NULL AND establishment_id = app_current_establishment_id()));
  END IF;
END
$$;

-- DOWN
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS orders_tenant_select ON public.orders;
    DROP POLICY IF EXISTS orders_tenant_write ON public.orders;
    ALTER TABLE public.orders NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS order_items_tenant_select ON public.order_items;
    DROP POLICY IF EXISTS order_items_tenant_write ON public.order_items;
    ALTER TABLE public.order_items NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.sub_bills') IS NOT NULL THEN
    DROP POLICY IF EXISTS sub_bills_tenant_select ON public.sub_bills;
    DROP POLICY IF EXISTS sub_bills_tenant_write ON public.sub_bills;
    ALTER TABLE public.sub_bills NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.sub_bills DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS products_tenant_select ON public.products;
    DROP POLICY IF EXISTS products_tenant_write ON public.products;
    ALTER TABLE public.products NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS categories_tenant_select ON public.categories;
    DROP POLICY IF EXISTS categories_tenant_write ON public.categories;
    ALTER TABLE public.categories NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.closure_bulletins') IS NOT NULL THEN
    DROP POLICY IF EXISTS closure_bulletins_tenant_select ON public.closure_bulletins;
    DROP POLICY IF EXISTS closure_bulletins_tenant_write ON public.closure_bulletins;
    ALTER TABLE public.closure_bulletins NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.closure_bulletins DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.closure_settings') IS NOT NULL THEN
    DROP POLICY IF EXISTS closure_settings_tenant_select ON public.closure_settings;
    DROP POLICY IF EXISTS closure_settings_tenant_write ON public.closure_settings;
    ALTER TABLE public.closure_settings NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.closure_settings DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.legal_journal') IS NOT NULL THEN
    DROP POLICY IF EXISTS legal_journal_tenant_select ON public.legal_journal;
    DROP POLICY IF EXISTS legal_journal_tenant_write ON public.legal_journal;
    ALTER TABLE public.legal_journal NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.legal_journal DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.archive_exports') IS NOT NULL THEN
    DROP POLICY IF EXISTS archive_exports_tenant_select ON public.archive_exports;
    DROP POLICY IF EXISTS archive_exports_tenant_write ON public.archive_exports;
    ALTER TABLE public.archive_exports NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.archive_exports DISABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.audit_trail') IS NOT NULL THEN
    DROP POLICY IF EXISTS audit_trail_tenant_select ON public.audit_trail;
    DROP POLICY IF EXISTS audit_trail_tenant_write ON public.audit_trail;
    ALTER TABLE public.audit_trail NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_trail DISABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS app_rls_bypass();
DROP FUNCTION IF EXISTS app_current_establishment_id();

