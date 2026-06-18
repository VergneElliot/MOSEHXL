# 71 — B1: Multi-tenancy (shared tables) + RLS guardrails (IMPLEMENTATION)

Date: 2026-04-24  
Status: **Implemented** (code, migration, tests).  
Plan reference: `docs/patch-notes/70-MULTI-TENANCY-B1-SHARED-TABLES-RLS-PLAN.md`.

---

## 1) What shipped

### 1.1 Architecture decision encoded in code/docs

- We commit to **shared-table multi-tenancy** (`establishment_id` scoping) and deprecate schema-per-tenant runtime behavior.
- Added plan doc: `docs/patch-notes/70-MULTI-TENANCY-B1-SHARED-TABLES-RLS-PLAN.md`.
- Updated key docs that still described schema-per-tenant as active:
  - `README.md`
  - `docs/course/05-DATABASE.md`
  - `docs/course/08-AUDIT-AND-FULL-COURSE.md`
  - `docs/course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md`
  - `docs/patch-notes/18-PRINTING-PRODUCTS-SCHEMA-FIX.md` (legacy banner)
  - audit cross-reference in `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

### 1.2 Removed active schema-per-tenant behavior (kept legacy metadata only)

- `models/establishment.ts`:
  - no longer creates per-tenant schemas during establishment creation;
  - no longer drops per-tenant schemas on establishment deletion;
  - keeps `schema_name` as **legacy metadata** only.
- `services/establishment/EstablishmentDataProcessor.ts`:
  - `createEstablishmentSchema()` is now a compatibility no-op (logs shared-table behavior).
- `services/establishmentAccountCreation/database/SchemaOperations.ts`:
  - no schema creation and no `SchemaManager` table creation;
  - logs tenant initialization in audit trail (`isolation_type: 'shared_table'`).

### 1.3 DB-level isolation: RLS + tenant context

- New migration:
  - `MuseBar/backend/src/migrations/files/2026_04_24_00_00_00_row_level_security_tenant_isolation.sql`
- Adds helper SQL functions:
  - `app_current_establishment_id()`
  - `app_rls_bypass()`
- Enables and **FORCES** RLS on tenant-owned high-risk tables:
  - `orders`, `order_items`, `sub_bills`
  - `products`, `categories`
  - `closure_bulletins`
  - `closure_settings` (if table/column exists)
  - `legal_journal`, `archive_exports`, `audit_trail`
- Policy model:
  - normal runtime: must match `app.establishment_id`;
  - controlled maintenance/migration: `app.bypass_rls = 'on'` bypass.

### 1.4 Migration engine bypass for controlled operations

- `src/migrations/migration-manager.ts` now sets:
  - `SELECT set_config('app.bypass_rls', 'on', true)` inside migrate/rollback transactions.
- This keeps FORCE RLS strict in app runtime but avoids breaking schema migrations.

### 1.5 Per-request DB tenant context plumbing

- New module: `src/db/tenantContext.ts` (`AsyncLocalStorage`).
- `middleware/auth.ts` now binds request chain to tenant context after JWT decode.
- `app.ts` wraps `pool.query` so authenticated tenant contexts execute with:
  - `SET LOCAL app.establishment_id = <tenant_uuid>`
  - inside a short transaction per query (required for RLS variable scoping).

### 1.6 Fail-closed legal/closure routes (no optional tenant)

- `routes/legal/closure.ts` now uses `getEstablishmentId(req,res)` on all endpoints.
- No `req.user?.establishment_id ?? undefined` fallback remains on closure routes.
- Closure bulletin model methods were tightened to require `establishmentId`:
  - `models/legalJournal/index.ts`
  - `models/legalJournal/closureOperations.ts`
  - `models/legalJournal/journalQueries.ts`
- Callers updated (`closure`, `compliance`, `archiveService`) to pass tenant explicitly.

### 1.7 Audited, time-bounded support impersonation

- Added in `routes/authLogin.ts`:
  - `POST /api/auth/support/impersonation/start`
  - `POST /api/auth/support/impersonation/stop`
- Behavior:
  - only `system_admin` can start;
  - requires `establishment_id` + `reason`;
  - mints short-lived token with target establishment + support metadata;
  - writes audit entries:
    - `SUPPORT_IMPERSONATION_STARTED`
    - `SUPPORT_IMPERSONATION_ENDED`
- `middleware/auth.ts` now carries/support-checks `support_impersonation` claim.
- `GET /api/auth/me` returns `support_impersonation` info when present.
- `POST /api/auth/refresh` blocks impersonation token refresh (must start explicit new support session).

### 1.8 Scheduler adjusted for per-establishment settings under RLS

- `utils/closureScheduler.ts` refactored:
  - loops establishments and evaluates closure conditions **per establishment**;
  - runs closure execution inside tenant context (`runWithTenantContext`);
  - supports per-establishment `closure_settings` when available;
  - falls back to legacy global settings table shape if `establishment_id` column is absent.

---

## 2) Verification

- Migration run: `npm run migration:migrate` ✅
- Type-check: `npx tsc --noEmit` ✅
- Test suite: `npx vitest run` ✅
  - now `4` test files / `13` tests.

New regression tests:

- `src/migrations/tenantRls.migration.test.ts`
  - verifies FORCE RLS + tenant/bypass policy primitives exist in migration SQL.
- `src/routes/authLogin.supportImpersonation.test.ts`
  - verifies support impersonation start/stop behavior and audit logging hooks.

---

## 3) Notes and trade-offs

- `schema_name` is still present for backward compatibility but is no longer the isolation mechanism.
- `pool.query` tenant wrapping uses a short transaction to scope `SET LOCAL app.establishment_id` safely.
- Scheduler includes a compatibility path for older `closure_settings` schema versions.
- Future tightening can migrate all legacy settings tables to explicit per-establishment rows and remove fallback logic.

