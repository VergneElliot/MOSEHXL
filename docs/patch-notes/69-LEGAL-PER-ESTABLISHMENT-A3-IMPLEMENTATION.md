# 69 — LEGAL: Per-establishment journal & related tables (A3 — IMPLEMENTATION)

Date: 2026-04-23  
Status: **Implemented** (code + migration landed in repo).  
Implements: audit **A3** — `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md` (lines 147–156).  
Plan reference: `docs/patch-notes/68-LEGAL-PER-ESTABLISHMENT-A3-PLAN.md`.

This document records **what was actually built**, how it differs from a narrative-only spec, and **residual notes** (migration semantics, rare edge cases).

---

## 1) Summary

- **`legal_journal`** is **scoped by `establishment_id`**. Sequence numbers are **unique per `(establishment_id, sequence_number)`**, not globally.
- The **immutability trigger** (`trigger_prevent_legal_journal_modification` → `prevent_legal_journal_modification()`) is **removed only inside the one-time SQL migration’s UP block**, then **recreated** so normal operation still **forbids UPDATE/DELETE** on the journal.
- **`audit_trail`** and **`archive_exports`** have **`establishment_id`** (with backfill from `users` where `user_id` / `created_by` is numeric and maps to a user), plus indexes.
- **Journal and signing code** require **`establishmentId`** for next sequence, listing, period queries, per-order queries, verify, and closure paths that read the journal.
- **Legal HTTP routes** for journal and compliance use **`getEstablishmentId`** / `req.user.establishment_id` so read paths are **establishment-scoped**.

---

## 2) Database migration (source of truth)

| Item | Location |
|------|----------|
| Migration SQL | `MuseBar/backend/src/migrations/files/2026_04_23_00_00_00_legal_journal_per_establishment.sql` |

**UP — behavior in prose:**

1. **Trigger:** `DROP TRIGGER` `trigger_prevent_legal_journal_modification` on `legal_journal` (so the migration can update/delete rows and change constraints).
2. **`legal_journal`:** add `establishment_id`; set from `orders.establishment_id` via `order_id`; for remaining nulls, if any establishment exists, set to the **oldest** establishment (`ORDER BY created_at`, then `id`); **delete** rows that still have null `establishment_id`; drop old global unique on `sequence_number`; add `UNIQUE (establishment_id, sequence_number)` as `legal_journal_establishment_sequence_key`; set `NOT NULL` on `establishment_id`; index `idx_legal_journal_establishment_id`.
3. **Re-create the immutability trigger** (same semantics as in `MuseBar/backend/src/models/legal-schema.sql`).
4. **`audit_trail`:** add nullable `establishment_id`; backfill from `users` when `user_id` matches a numeric `users.id`; optional fallback to **first** establishment by `id` for remaining nulls; index `idx_audit_trail_establishment_id`.
5. **`archive_exports`:** add nullable `establishment_id`; backfill from `users` via `created_by` when it parses as a user id; index `idx_archive_exports_establishment_id`.

**DOWN — best-effort:** drops indexes, drops `archive_exports` / `audit_trail` columns, drops trigger, reverts `legal_journal` to global `UNIQUE (sequence_number)` and drops `establishment_id`, recreates trigger. **May fail** if data violates global sequence uniqueness; intended for dev rollback only.

**Tooling note:** the project’s `MigrationManager` requires **`-- UP`** and **`-- DOWN`** section markers in the file.

---

## 3) Application changes (file-level map)

### 3.1 Core journal

| Area | Path(s) |
|------|--------|
| Queries & insert | `MuseBar/backend/src/models/legalJournal/journalQueries.ts` |
| Operations | `MuseBar/backend/src/models/legalJournal/journalOperations.ts` |
| Public model API | `MuseBar/backend/src/models/legalJournal/index.ts` |
| Hash / integrity | `MuseBar/backend/src/models/legalJournal/journalSigning.ts` |
| Closures (periods, bulletins) | `MuseBar/backend/src/models/legalJournal/closureOperations.ts` |
| Types | `MuseBar/backend/src/models/legalJournal/types.ts` |

**Notable rules in code:** `logTransaction` requires **`order.establishment_id`**. `getNextSequenceNumber` / `getLastEntry` / `getEntriesForPeriod` / `getEntriesForOrder` are **all establishment-scoped**.

### 3.2 Stats and supporting repos

- `MuseBar/backend/src/models/legalJournal/businessDayStatsRepository.ts`
- `MuseBar/backend/src/models/legalJournal/monthlyLiveStatsRepository.ts`
- `MuseBar/backend/src/models/legalJournal/businessInfoModel.ts` (unchanged in spirit — already per-establishment; listed where journal-related flows intersect business info)

### 3.3 Archives

- `MuseBar/backend/src/models/archiveService.ts` — `INSERT` includes `establishment_id`; DAILY/MONTHLY/FULL export paths require `establishment_id` where the journal is involved; **`getArchiveExports(establishmentId: string)`**, **`getArchiveExportById(id, establishmentId)`**, **`verifyArchiveExport(id, establishmentId)`**, and **`downloadArchiveExport(id, establishmentId)`** are **tenant-mandatory** — there is no code path that lists or fetches exports for all establishments.
- `MuseBar/backend/src/routes/legal/archive.ts` — `requirePermission(P.access_closure)` (same family as clôture), then **`getEstablishmentId`** on every handler; **403** if the user has no establishment (e.g. `system_admin` without tenant — **by design**: no cross-tenant fiscal dump). Replaces the old **`requireAdmin`** pattern that let a platform admin call list with `undefined` establishment and receive an unscoped query from the service layer.

### 3.4 Legal & compliance HTTP

- `MuseBar/backend/src/routes/legal/journal.ts` — verify, entries, stats, etc., use `getEstablishmentId` + scoped queries.
- `MuseBar/backend/src/routes/legal/compliance.ts` — aligned with establishment-scoped journal / stats where applicable.

### 3.5 Orders (journal writers)

- `MuseBar/backend/src/routes/orders/orderCRUD.ts`, `orderCancel.ts`, `orderChange.ts`, `orderLegal.ts` — pass establishment context into `LegalJournalModel` / journal helpers.

### 3.6 Audit

- Audit layer / establishment insert: implementation sets **`establishment_id`** on new audit rows where the user or context allows (see `auditTrail` and related establishment audit service usage in the backend tree).

### 3.7 Schema comment

- `MuseBar/backend/src/models/legal-schema.sql` — contains a **short note** that multi-tenant journal details live in the migration; full `CREATE TABLE` in that file is not a second source of truth for production (DB is migrated).

---

## 4) API behavior (post-change)

- **`GET /api/legal/journal/verify`** and **`GET /api/legal/journal/entries`:** resolve **establishment** from the authenticated user; verify only that tenant’s chain; entries list is filtered the same way.
- **Order-linked journal reads** in `orderLegal` (or equivalent) require **order + establishment** match so one tenant cannot read another’s journal by `orderId` alone.
- **Archives:** **`POST /api/legal/archive/create`**, **`GET /list`**, **`GET /:id`**, **`POST /:id/export`** all call **`getEstablishmentId`** first — **no establishment → 403**. **`ArchiveService`** only queries with **`WHERE establishment_id = $1`** (or `id` + `establishment_id` together). **`system_admin`** with **`establishment_id: null`** cannot list or read archives by API; this matches the policy that platform operators are not a back door to tenant fiscal data (if cross-tenant support is ever needed, it must be an explicit, audited product decision — not an accidental unscoped `SELECT`).

---

## 5) Residual notes (not open “bugs” in A3)

### 5.1 Curriculum / developer docs

- **`docs/course/07-LEGAL-COMPLIANCE.md`** is updated to describe **per-establishment** sequence chains, **`verifyJournalIntegrity(establishmentId)`**, audit `establishment_id`, and **tenant-only** archive access.
- **`docs/patch-notes/17-LEGAL-JOURNAL-MULTI-TENANCY-FIX.md`** still describes **closure** scoping; its archive bullet points to this doc (69) for the **A3** archive **API** rules.

### 5.2 Backfill semantics (migration time)

- **Journal:** orphan rows with no resolvable establishment are **deleted** in migration (see SQL). That is **data loss** for those rows; acceptable only if they were invalid in production.
- **Audit / archive exports:** fallback assignment to a **default establishment** in SQL is a **heuristic** for legacy rows, not a legal attestation of which tenant performed the action.

### 5.3 DOWN migration

- Rollback reintroduces **global** unique `sequence_number` and can **fail** if two tenants reuse the same sequence integers — use DOWN **in dev only**, not after a production cutover you intend to keep.

---

## 6) Verification already performed in development

- **`npm run migration:migrate`** — succeeds with UP/DOWN format and **trigger drop/recreate** in the legal_journal section.
- **`npx tsc --noEmit`** — passes (as of the implementation window).
- **`npx vitest run`** — backend tests pass (9 tests in the then-current suite; re-run after further edits).

**Manual / staging checks recommended for “done” sign-off (see also plan §5):**

- Two establishments, two journals: sequences **independent**; verify endpoint **per tenant**; no cross-tenant entries in `GET` journal entries.
- Confirm **`UPDATE legal_journal` fails** in SQL after migration (trigger active).

---

## 7) Where we stand vs audit A3

| Audit bullet | Status |
|--------------|--------|
| Add `legal_journal.establishment_id` + backfill + per-tenant unique sequence | **Done** (see migration). |
| Rewrite journal query helpers + callers | **Done** (core journal + order/legal routes). |
| `audit_trail` / `archive_exports` + backfill + filter | **Done** in DB; app layer uses mandatory tenant id on archive list/get/verify; journal paths scoped. |
| Legal API filter by `req.user.establishment_id` (and no accidental global queries) | **Done** for journal, compliance, and **archives** (see §3.3, §4). |
| Keep DB trigger against UPDATE/DELETE | **Done** in steady state; **briefly** dropped in migration per §2. |
