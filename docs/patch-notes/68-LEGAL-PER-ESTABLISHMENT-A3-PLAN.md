# 68 — LEGAL: Per-establishment journal & related tables (A3 — PLAN)

Date: 2026-04-22 (audit reference); this plan was written 2026-04-23.  
Status: **Plan of record** for audit item **A3** in `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md` (lines 147–156).  
Companion: `docs/patch-notes/69-LEGAL-PER-ESTABLISHMENT-A3-IMPLEMENTATION.md` (what was built).

---

## 0) Why A3 exists

The repository audit identified a **compliance and privacy failure** in a multi-tenant product:

- The **legal journal** (`legal_journal`) used a **single global** `sequence_number` and no `establishment_id`, so the fiscal chain, integrity checks, and any period queries could **mix or leak** data across tenants.
- **Closures** and API routes that read the journal need to be **strictly scoped** to the authenticated establishment.
- For operational consistency, related artifacts (**audit trail**, **archive exports**) should also be **filterable and attributable** per establishment.

**Goal after A3:** the system behaves as **one inalterable legal journal *per legal entity (establishment)***: sequence monotonicity, hash chain, and HTTP access are all **tenant-scoped**, while **PostgreSQL still forbids UPDATE/DELETE** on journal rows in normal operation.

**Related prior work (conceptual, not a duplicate spec):** `docs/patch-notes/17-LEGAL-JOURNAL-MULTI-TENANCY-FIX.md` — closure order filtering by establishment. A3 **extends** that to the **database and journal subsystem** (sequences, API, audit/archives).

---

## 1) Objectives (acceptance criteria)

1. **Schema**
   - `legal_journal` has **`establishment_id`** (required after migration), with **`UNIQUE (establishment_id, sequence_number)`** instead of a global unique on `sequence_number` alone.
   - **`audit_trail`** and **`archive_exports`** gain **`establishment_id`** (nullable where backfill is ambiguous; indexed for filtering).
2. **Data migration**
   - Backfill `legal_journal.establishment_id` primarily from `orders.establishment_id` via `legal_journal.order_id`.
   - Define explicit behavior for **orphan** journal rows (no resolvable `order_id` / `establishment_id`) — either delete, or assign only with documented risk (see plan §3).
3. **Application layer**
   - All journal operations that allocate a sequence, read the chain, or verify integrity take **`establishmentId`** and **only** touch rows for that tenant.
   - Closures and period aggregations use **the same** establishment scope.
4. **API**
   - `GET` journal and verify endpoints, and order-linked journal reads, return data **only** for `req.user`’s establishment (or explicit product rules for `system_admin`, if any — should be a conscious decision, not an accident).
5. **Legal inalterability (DB)**
   - The trigger **`trigger_prevent_legal_journal_modification`** (BEFORE UPDATE OR DELETE) **remains the rule in steady state**: application code must not rely on mutating journal rows.  
   - **Exception:** a **one-time migration** may need to **temporarily drop** the trigger, perform controlled DDL/DML, then **re-create** the same trigger so production behavior is unchanged after the migration.
6. **Documentation**
   - A written **plan** (this file) and an **implementation** note (69) so future changes do not reintroduce global queries.

---

## 2) Planned work items (checklist)

### 2.1 Database — `legal_journal`

| Step | Action |
|------|--------|
| A | Add `establishment_id UUID REFERENCES establishments(id)` (ON DELETE policy chosen for safety — e.g. RESTRICT to avoid silent journal loss). |
| B | Backfill from `orders` on `order_id`. |
| C | Handle rows that still have `NULL` establishment (policy decision). |
| D | Drop global `UNIQUE (sequence_number)`; add `UNIQUE (establishment_id, sequence_number)`. |
| E | `NOT NULL` on `establishment_id` once safe. |
| F | Index on `establishment_id` for list/period queries. |
| G | **Migration UP:** `DROP TRIGGER` on `legal_journal` → perform steps A–F → `CREATE TRIGGER` to restore `prevent_legal_journal_modification()`. |
| H | **Migration DOWN (best-effort):** reverse DDL in safe order; document that rollback may fail if data no longer fits global uniqueness. |

### 2.2 Database — `audit_trail` and `archive_exports`

| Step | Action |
|------|--------|
| A | Add `establishment_id` (typical backfill: join `user_id` / `created_by` → `users.establishment_id` where possible). |
| B | Optional fallback for legacy rows (e.g. single-establishment default) **only** if the product had no multi-tenant data at the time; must be **documented** as a heuristic, not a legal guarantee. |
| C | Index `establishment_id` for list filters. |

### 2.3 Backend code — journal core

- **`JournalQueries`:** `getNextSequenceNumber`, `getLastEntry`, `getEntriesForPeriod`, pagination, stats, per-order queries — all **`WHERE establishment_id = $1`** (or equivalent).
- **`JournalOperations` / `LegalJournalModel`:** `addEntry`, `logTransaction`, `logChange`, `verifyJournalIntegrity` — first-class **`establishmentId`** (and assert `order.establishment_id` where an order is involved).
- **`JournalSigning`:** integrity verification iterates the **per-tenant** ordered chain (no assumption that `sequence_number` is globally unique).
- **Closure / stats repositories:** any SQL touching `legal_journal` or closure bulletins is **establishment-scoped** (align with `closureOperations` and repositories already taking `establishmentId`).

### 2.4 Backend code — orders & legal routes

- Order routes that write to the journal pass **`establishment_id`** from the order (or resolved establishment context).
- `GET /api/legal/journal/entries`, `GET /api/legal/journal/verify`, and any `journal`-by-order routes use **`getEstablishmentId`** (or equivalent) and do not return other tenants’ rows.
- **Archives:** create/list/get paths pass **`establishment_id`** into `ArchiveService` and avoid listing **all** tenants’ exports unless there is an explicit, audited **platform-admin** use case (otherwise **always** filter).

### 2.5 Audit model

- Inserts into `audit_trail` set **`establishment_id`** when known (e.g. from the acting user’s establishment, or from the target resource).

### 2.6 Types & tests

- Types for `JournalEntry` (and order payloads used by the journal) include **`establishment_id`** as required where applicable.
- Tests updated for new function signatures; migration runnable via project **`migration:migrate`** (SQL file must include **`-- UP` / `-- DOWN`** per `MigrationManager`).

### 2.7 Documentation (non-code)

- **Patch notes 68/69** (this plan + implementation).
- **Course doc** `docs/course/07-LEGAL-COMPLIANCE.md` updated (2026-04-23) for per-establishment journal, audit `establishment_id`, and tenant-only archives.

---

## 3) Risks, constraints, and policy choices

- **Immutability trigger:** Dropping the trigger is **only** for the migration window; the **post-migration** state must match **pre-migration** rules (BEFORE UPDATE OR DELETE still raises). This is a **deployment-time** exception, not a change to inalterability in production.
- **Backfill heuristics:** Assigning “leftover” rows to a **default establishment** (e.g. first by `id`) is **operationally** convenient but **not** legally perfect if multiple tenants already had data; the implementation doc should state what was done.
- **Orphan `legal_journal` rows** (no establishment): the planned approach may **delete** them rather than leave invalid data; that must be a **documented** migration choice.
- **System / platform users without `establishment_id`:** **implemented (2026-04-23):** legal archive routes use **`getEstablishmentId`** → **403** without tenant; **`ArchiveService`** no longer supports an unscoped list/get. No dedicated cross-tenant admin route (would need an explicit future product/audit decision).

---

## 4) Out of scope (for A3)

- Dropping the `is_admin` column or full role unification (other audit items).
- **A4** backend permission middleware on all routers.
- **Schema-per-tenant** (audit “Option 2”); A3 is **row-level** multi-tenancy.
- Re-implementing PDF export for archives (unchanged by A3).

---

## 5) Verification (how we know A3 is “done”)

- [ ] Migration applies cleanly on a copy of production-like data; **`npm run migration:migrate`** succeeds.
- [ ] **Trigger exists** on `legal_journal` after migration; ad-hoc `UPDATE`/`DELETE` on journal rows still **fails** with the legal exception.
- [ ] For two establishments with data, each sees **independent** sequence chains and **no cross-tenant** rows in journal/verify/entries and closure-derived stats.
- [ ] `tsc` and automated tests pass; manual smoke of legal journal and archive list for a non-admin and establishment admin as appropriate.

Use **`69-LEGAL-PER-ESTABLISHMENT-A3-IMPLEMENTATION.md`** to record which of the above were satisfied and any deliberate deviations.
