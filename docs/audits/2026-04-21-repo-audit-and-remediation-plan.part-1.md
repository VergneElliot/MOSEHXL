# MOSEHXL — Full Code & Architecture Audit (April 2026) — Part 1

Date: 2026-04-21  
Scope: `/home/zone01student/Projects/MOSEHXL` (repo-wide), focusing on `MuseBar/backend` and `MuseBar` frontend.  
Purpose: Preserve the audit and the full remediation plan “word for word” for traceability.

---

## Executive summary — the 6 headline findings

| # | Finding | Severity | Area |
|---|---------|----------|------|
| **1** | **Login collapses "system admin" and "establishment admin" into a single flag.** Any row with `users.is_admin = true` is issued a JWT with `role = 'system_admin'`, regardless of `users.role`. Three separate code paths (setup wizard, invitation acceptance) **set `is_admin = true` for establishment admins**, which makes them global system admins at runtime. This is the exact "admins show as system admins" bug you described. | **CRITICAL** | Auth / roles |
| **2** | **The legal journal (Pillar I — Inaltérabilité) is a single global SHA-256 hash chain shared across all establishments.** One `sequence_number UNIQUE`, one chain. In a multi-tenant SaaS, each tenant is a distinct legal entity (different SIRETs) — they **cannot** legally share one journal. This is an NF525 / Article 286-I-3 bis compliance defect as soon as there is more than one establishment. | **CRITICAL** (legal) | Fiscal compliance |
| **3** | **`POST /api/auth/setup` is publicly reachable with no authentication.** It creates the first system admin whenever zero admins exist. Combined with `app.listen(port, '0.0.0.0')` and permissive LAN CORS, an unprotected server = attacker grabs system-admin on first HTTP request after a DB wipe or on any instance that wasn't bootstrapped yet. | **CRITICAL** | Security |
| **4** | **"Schema-based multi-tenancy" is advertised but never used at runtime.** `SchemaManager` creates an `establishment_<uuid>` schema per tenant, but no code path reads from it. All real queries hit `public.*` and filter by `establishment_id`. The `schema_name` column and every per-tenant schema created so far are dead weight and misleading documentation. | **HIGH** (architecture) | DB architecture |
| **5** | **Legal journal/archive APIs are not tenant-filtered.** `GET /api/legal/journal/entries`, `GET /api/legal/journal/verify`, archive `list`/`get`, `orderLegal.GET /journal/:orderId`, and `audit_trail` listings have **no `establishment_id` filter**. Any authenticated establishment user can read the cross-tenant chain. | **HIGH** (legal + privacy) | Fiscal compliance + RBAC |
| **6** | **`ssh root@<IP>` with no authentication** is **not visible in this repo.** No deployment scripts in `scripts/` or `.github/workflows/` configure SSH, users, firewalls, or the production host. This is a **host/cloud configuration issue**, not a code issue — but given how this project handles fiscal data, the server itself must be hardened separately (see action plan §6). | **CRITICAL** (ops) | Infra |

Everything else that follows is elaboration + mid-tier issues + the remediation plan.

---

## 1. Project structure & current state (context)

- Repo layout: `MuseBar/backend/` (Node + Express + TS, port 3001), `MuseBar/src/` (React + TS, port 3000), `scripts/` (on-site install scripts), `docs/` (10 course chapters + 45+ patch notes), `printer-bridge/` (effectively orphaned, see §7), `backups/`.
- Two branches: `main` = V1 (prod at mosehxl.com), `development` = V2 rewrite — this audit covers `development`.
- 45+ post-audit fixes already applied (patch notes 11–60). The codebase is in significantly better shape than "before". What remains are **structural** issues and **the three or four critical bugs above**.

---

## 2. Legal compliance audit (French ISCA — Article 286-I-3 bis du CGI)

The four pillars are implemented in spirit but have several concrete defects.

### Pillar I — Inaltérabilité (Immutability)

| Check | Status | Evidence |
|---|---|---|
| Append-only `legal_journal` table with SHA-256 chain | ✅ Implemented | `models/legalJournal/journalSigning.ts`, `journalOperations.ts` |
| DB trigger blocks UPDATE/DELETE | ✅ Implemented | `models/legal-schema.sql` trigger `trigger_prevent_legal_journal_modification` |
| **Chain is per-legal-entity (per establishment)** | ❌ **FAILS** — single global chain | `journalQueries.getNextSequenceNumber()` = `MAX(sequence_number) + 1` across the **whole table**; `legal_journal` has no `establishment_id` column |
| Journal entries wired on every SALE / REFUND | ✅ Implemented | `routes/orders/orderCRUD.ts`, retour/cancel-unified |
| Journal integrity verification endpoint | ✅ Implemented but **unscoped** | `GET /api/legal/journal/verify` re-hashes the entire chain regardless of caller's establishment |

**Verdict:** the *mechanism* is correct for a single-entity POS. The *scope* is wrong for SaaS. Each SIRET needs its own chain; mixing sequence numbers across establishments means:

- Closure bulletins for establishment A can contain `first_sequence`/`last_sequence` that include B's rows (`getEntriesForPeriod(start, end)` has no tenant filter — `models/legalJournal/journalQueries.ts:52-59`).
- During an inspection of one establishment, producing the chain that proves their sales will necessarily include other tenants' hashes (privacy + data-protection issue under GDPR as well, since per-tenant sales data is legally segregated).

### Pillar S — Sécurisation (Security / audit trail)

| Check | Status |
|---|---|
| Audit trail table + model | ✅ |
| Logged: LOGIN, LOGIN_FAILED, LOGOUT, CREATE_USER, SET_PERMISSIONS, CREATE_ORDER, CANCEL_ORDER, RETOUR, TOKEN_REFRESH | ✅ |
| `establishment_id` on audit entries | ❌ **Missing column** — `audit_trail` is global (`models/legal-schema.sql`, `models/auditTrail.ts`) |
| IP / user-agent captured | ✅ |
| Audit log exposed through an authenticated, tenant-scoped endpoint | ⚠ `orderAudit.ts` GET returns empty stubs (`DEVELOPMENT-STATE.md` known issue #9) |
| Silent audit failures | ⚠ Many callers use `.catch(() => {})` so audit-write failures are invisible (e.g. `authLogin.ts:34,46,68,149,166`) |

### Pillar C — Conservation (closure bulletins)

| Check | Status |
|---|---|
| Daily/weekly/monthly/annual closure types | ✅ |
| Scheduler at 02:00 Paris time (prod only) | ✅ `ClosureScheduler.start()` |
| **Per-establishment** closure bulletins | ✅ **Fixed** in patches 17, 2026_02_26_02, 2026_03_19 backfill |
| VAT breakdown by rate (10% / 20%) stored at `DECIMAL(12,4)` | ✅ |
| Tips/change excluded from `total_amount` legally (patches 2026_03_13 / fond_de_caisse) | ✅ |
| Bulletin hash for integrity | ✅ `closure_hash` column |

This pillar is the strongest — several recent migrations explicitly hardened it.

### Pillar A — Archivage (archiving)

| Check | Status |
|---|---|
| Export formats (CSV, JSON, XML) | ✅ |
| HMAC-SHA256 signatures | ✅ `archiveService.ts` |
| `ARCHIVE_SECRET_KEY` required in prod, no fallback | ✅ |
| **Per-establishment** export scoping | ❌ `archive_exports` has no `establishment_id`; `SELECT * FROM archive_exports` returns all tenants |
| Export includes only caller's journal entries | ❌ Inherits the global-journal defect |

### Other fiscal compliance items

- **NF525 certification readiness** — README says "Ready; critical fixes applied". **In current state for multi-tenant = not ready.** The per-tenant chain must exist before LNE/AFNOR can certify a multi-establishment install.
- **Fine risk** — €7,500 per non-compliant register. If you treat each establishment as a register, this scales.
- **Display prices TTC** (inclusive of VAT) — ✅ correctly implemented (`docs/course/07` and `usePOSLogic`).

