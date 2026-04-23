# 75 — B3: Printing tables in migration chain (IMPLEMENTATION)

Date: 2026-04-24  
Status: **Implemented** (migration + route guard + tests).  
Plan reference: `docs/patch-notes/74-PRINTING-TABLES-MIGRATION-CHAIN-B3-PLAN.md`.

---

## 1) What was implemented

### 1.1 Migration-chain ownership for printing tables

Added migration:

- `MuseBar/backend/src/migrations/files/2026_04_24_02_00_00_printing_tables_in_migration_chain.sql`

The migration now ensures both tables exist and have the columns required by current code:

- `printing_configurations`
  - `id`, `establishment_id`, `provider`, `config`, `is_active`, `created_at`, `updated_at`
- `printing_history`
  - `id`, `establishment_id`, `print_type`, `provider`, `status`, `metadata`, `created_at`

Approach:

- `CREATE TABLE IF NOT EXISTS` (idempotent)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for compatibility with drifted DBs
- non-destructive defaults + `NOT NULL` enforcement on expected columns
- adds indexes used by established query patterns.

### 1.2 RLS policies applied to newly managed printing tables

Because these tables are now created after B1 RLS base migration, this migration explicitly applies tenant RLS:

- `ENABLE` + `FORCE ROW LEVEL SECURITY`
- `printing_configurations_tenant_select` / `printing_configurations_tenant_write`
- `printing_history_tenant_select` / `printing_history_tenant_write`

Policies follow the same model as B1:

- normal runtime scoped by `app.establishment_id`
- controlled maintenance via `app.bypass_rls`.

### 1.3 Runtime guard improvement in `/api/printing/history`

File updated:

- `MuseBar/backend/src/routes/printing.ts`

Improvement:

- sanitize and clamp `limit`/`offset` query params:
  - `limit` defaults to `50`, max `500`
  - `offset` defaults to `0`
- avoids passing unchecked string values into SQL pagination bindings.

---

## 2) Tests and verification

### 2.1 New migration test

Added:

- `MuseBar/backend/src/migrations/printingTables.migration.test.ts`

Asserts:

- migration contains both table creations with expected core columns
- migration contains tenant RLS policy setup for both printing tables.

### 2.2 Execution checks

Run results:

- `npm run migration:migrate` ✅
- `npx tsc --noEmit` ✅
- `npx vitest run` ✅ (`6` files, `17` tests)

---

## 3) Outcome vs audit B3

Audit B3 asked to put `printing_configurations` and `printing_history` into the migration chain and verify shape against code (`printingConfigRepo.ts`, `logPrintingHistory`).

Result:

- Migration-chain ownership is now explicit and versioned.
- Table shapes match the code paths in `printingConfigRepo.ts`, `printDataRepo.ts`, and `routes/printing.ts`.
- Tenant RLS is applied to these tables to stay consistent with B1 isolation guarantees.

