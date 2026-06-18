# 74 — B3: Put printing tables into migration chain (PLAN)

Date: 2026-04-24  
Branch: `development`  
Status: Plan only.

This plan addresses audit item **B3** in `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`:

- Add migration-chain ownership for `printing_configurations` and `printing_history`.
- Ensure table shapes match code expectations (`printingConfigRepo.ts`, `logPrintingHistory`).

---

## 0) Problem statement

Printing code actively uses:

- `printing_configurations`:
  - columns used: `establishment_id`, `provider`, `config`, `is_active`, `created_at`
- `printing_history`:
  - columns used: `establishment_id`, `print_type`, `provider`, `status`, `metadata`, `created_at`

Audit found no migration file creating these tables, which creates schema drift risk (manual DB state differs across environments).

---

## 1) Scope

### 1.1 In scope

1. Add one migration that `CREATE TABLE IF NOT EXISTS` for:
   - `printing_configurations`
   - `printing_history`
2. Add indexes used by route/query patterns.
3. Keep SQL compatible with existing runtime behavior (no breaking column renames).
4. Add/adjust documentation patch note for B3 implementation after code is done.

### 1.2 Out of scope

- Refactoring printing business logic.
- Adding new providers or changing printer protocol payloads.
- B4 (`orders.receipt_*` schema clarification) — handled in next phase.

---

## 2) Planned migration design

### 2.1 `printing_configurations` target shape

- `id SERIAL PRIMARY KEY`
- `establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE`
- `provider VARCHAR(64) NOT NULL`
- `config JSONB NOT NULL DEFAULT '{}'::jsonb`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

Indexes:

- `idx_print_cfg_establishment` on `(establishment_id)`
- `idx_print_cfg_establishment_active` on `(establishment_id, is_active, created_at DESC)`

### 2.2 `printing_history` target shape

- `id SERIAL PRIMARY KEY`
- `establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE`
- `print_type VARCHAR(64) NOT NULL`
- `provider VARCHAR(64) NOT NULL`
- `status VARCHAR(32) NOT NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`

Indexes:

- `idx_print_hist_establishment_created` on `(establishment_id, created_at DESC)`
- `idx_print_hist_establishment_type` on `(establishment_id, print_type)`

### 2.3 Data-safety posture

- Non-destructive migration (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- No deletion or mutation of existing records.
- If tables already exist, migration should be idempotent and safe to run.

---

## 3) Verification plan

After migration:

1. `npm run migration:migrate` must pass.
2. `npx tsc --noEmit` and `npx vitest run` must pass.
3. Route-level smoke (manual):
   - list/save printing configs
   - log/retrieve printing history

---

## 4) Completion artifacts

- Implementation note to create after execution:
  - `docs/patch-notes/75-PRINTING-TABLES-MIGRATION-CHAIN-B3-IMPLEMENTATION.md`

