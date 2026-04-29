# MOSEHXL — Full Repo State Audit (Hard Copy)

- **Date:** 2026-04-29
- **Branch:** `development`
- **Scope:** Entire repository — backend (`MuseBar/backend/src`), frontend (`MuseBar/src`), shared types (`MuseBar/packages/types`), root + `docs/` documentation, migrations, patch notes.
- **Out of scope:** Server / host hardening (A5 from the original April-21 audit) — production infra is not part of this code-side review.
- **Predecessor:** `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md` (every P0/P1/P2 item from that snapshot has been remediated; this doc is a fresh post-remediation read of the codebase).

---

## 0. Executive verdict (hard truth)

The repo is in **substantially better shape** than at the April 23 snapshot. Every prioritized item from that audit was executed (P0-1 → P2-8 Pass 19 + Non-Blocking #9), and the post-remediation surfaces (legal/printing routes, error handling, RLS scaffolding, token rotation, dead-code quarantine, docs labeling) hold up.

That said, this fresh read surfaces **new findings that were not on the April 23 list** — most of them long-standing, simply not yet looked at. The most important ones:

1. **Refund / change / tip-reversal journal writes are not fail-safe.** Unlike the new `POST /api/orders` SALE path (which compensates on journal failure), `POST /api/orders/payment/cancel` and `POST /api/orders/payment/change` create the order, then call `LegalJournalModel.logChange` / `addEntry('REFUND', …)` inside a `try/catch` that **only logs** the failure. The order succeeds and a `201` is returned even when the journal line was never persisted. **This is the same class of bug that P0-2 fixed for SALE; it has to be applied to REFUND, CHANGE, and tip reversal too.** (Severity: **P0**.)
2. **`POST /api/legal/archive/:id/export` lies to the caller.** It returns `"Archive exported successfully"` with a `note: 'Export functionality to be implemented'`. (Severity: **P0** — compliance-facing endpoint that asserts success it cannot deliver.)
3. **`logClosure` is dead code.** Closure bulletins persist into `closure_bulletins` and are signed, but no `CLOSURE` row is appended to `legal_journal`. The signed journal stream therefore does not record fiscal-period closes — a coherence gap vs an "everything in one append-only signed stream" reading of NF525. (Severity: **P1**.)
4. **`JournalSigning.verifyJournalIntegrity` silently skips violations** for `sequence_number === 128`, `CORRECTION` rows, and "documented" `HASH_CHAIN_INTEGRITY` corrections. This was historically a pragmatic shim; for a defensible compliance claim it needs to be either gated behind an explicit "legacy-data" mode or removed once data is clean. (Severity: **P1**.)
5. **Several authenticated endpoints expose fiscally-sensitive data without a granular permission gate** (e.g. `GET /api/legal/business-day-stats` only `requireAuth`; `POST /api/orders/audit/log` only `requireAuth` and trusts `userId` from `req.body`). (Severity: **P1**.)
6. **No software-events fiscal journal.** NF525 expects "journal des événements logiciels" (boot, shutdown, time change, software update, configuration change) appended to the signed stream. Nothing in the repo implements this. (Severity: **P0** if you want to claim NF525-style completeness; **P1** if your shipping target is "Article 286-I-3 bis baseline" only.)
7. **`POST /api/auth/refresh` issues the new token before revoking the old one.** A second refresh racing the first can leave two valid tokens. Same shape exists for impersonation start. (Severity: **P1**.)
8. **`establishment_admin` implicitly receives every permission name in the registry** (`UserModel.getUserPermissions` short-circuits to `Object.values(P)`). Practical and convenient, but the blast radius of a compromised `establishment_admin` is the entire permission catalog. (Severity: **P1**.)
9. **Documentation has drifted again** (DEVELOPMENT-STATE migration count = 12 vs 28 actual; Known Issue #9 still listed as "stub" although it was wired; course chapter 10 still teaches `cashier` role; patch-note #15 still uses present tense for schema-per-tenant; root TOC stops at patch #57 while the folder has 170+ files).

The "is the repo legally compliant?" answer therefore has not changed since April 23: **architecturally close, formally not certifiable until items 1–4 + 6 are closed and the integrity verifier no longer skips its own errors.**

---

## 1. Status of the previous audit (April 23 hard copy)

| April 23 item | Status today | Evidence |
|---|---|---|
| P0-1 Legal journal `INSERT` arity | Done | `journalQueries.ts` L249-272: 13 columns, 13 placeholders, 13 values |
| P0-2 Order + journal fail-safe (SALE) | Done | `orderCRUD.ts` L163-230: failure → compensating delete + 500 |
| P0-3 SetupAuditManager schema alignment | Done | `SetupAuditManager.ts` writes canonical `audit_trail` columns |
| P0-4 orderCRUD error-handling consolidation | Done | `orderCRUD.ts` uses `asyncHandler` + `AppError` throughout |
| P0-5 orderLegal C2 + A4 hardening | Done | `orderLegal.ts` `requirePermission(P.access_compliance)` |
| P0-6 D1 token rotation on refresh + impersonation | Done | `authLogin.ts` revokes old token; concurrency window noted below as new finding |
| P0-7 App exposure hardening | Done | `app.ts` dynamic CORS, Swagger gated, `x-powered-by` off, client-error key gate |
| P1-1 A3 NOT NULL + closure uniqueness | Done | `2026_04_29_18_00_00_a3_constraints_hardening.sql` |
| P1-2 Legal routes A4 + C2 | Done | `legal/journal.ts`, `legal/compliance.ts`, `legal/stats.ts` use `requirePermission(P.access_compliance)` |
| P1-3 Legal archive/closure C2 + A4 | Done | `legal/archive.ts`, `legal/closure.ts` use `requirePermission(P.access_closure)` |
| P2-1/2/3 Dead-code quarantine | Done | `CorsConfiguration.ts`, logger/receipts barrels, `SchemaManager.ts`, `thermalPrint/*` deleted |
| P2-4/5/6/7 Docs truth alignment | Partial | Course/README sweep landed; new drift since (see §6) |
| P2-8 Test expansion (19 passes) | Done | New + extended legal/printing route + journal integrity tests |
| Non-blocking #9 Order audit GET wiring | Done | `orderAudit.ts` L67-72, L96-114; `auditTrail.ts` `getOrderAuditEntries` |

Everything from April 23 was actually executed. The remaining work below is **new ground**, not regression.

---

## 2. Legal / fiscal compliance — where we stand

### 2.1 Inaltérabilité — legal_journal (PARTIAL)

Strong:
- Hash-chained per-establishment journal with `UNIQUE (establishment_id, sequence_number)` and `establishment_id NOT NULL` — `MuseBar/backend/src/migrations/files/2026_04_23_00_00_00_legal_journal_per_establishment.sql` L28-34.
- DB-level `BEFORE UPDATE OR DELETE` trigger blocks mutation — same migration L38-41.
- Programmatic chain verification — `journalSigning.ts` `verifyJournalIntegrity`.
- SALE write path is fail-safe: journal failure rolls back the order and returns 500 — `orderCRUD.ts` L163-230.

Weak:
- **(P0) Refund / change / tip-reversal write paths are not fail-safe.**
  - `orderChange.ts` L43-95: order created, then `LegalJournalModel.logChange` inside `try/catch` that only logs the error. The 201 is returned regardless.
  - `orderCancel.ts` L304-313 (tip reversal `logChange`) and L315-345 (REFUND `addEntry`) have the same shape: log on failure, swallow, continue.
  - Net effect: a refund or change can be persisted as an order **without** a corresponding journal line. This is exactly the bug class P0-2 fixed for SALE — the same fix has to be applied here.
- **(P1) `verifyJournalIntegrity` skips its own errors** for `sequence_number === 128`, `CORRECTION` rows, and "documented" `HASH_CHAIN_INTEGRITY` corrections (`journalSigning.ts` L67-105). The hard-coded `128` check is the worst offender — it pins compliance behavior to a single historical row.
- **(P2) Append is not transactional / serializable.** `getNextSequenceNumber` + `getLastEntry` + `insertEntry` are three separate statements in `journalOperations.ts addEntry` (L24-52). Under concurrent SALE bursts, the `UNIQUE` on `(establishment_id, sequence_number)` is the only thing keeping the chain consistent — that surfaces as failed sales without a retry strategy. Acceptable today (rate is low) but should be hardened with `SERIALIZABLE` + retry, or a per-establishment advisory lock.
- **(P2) `JournalQueries.resetJournalDevOnly` issues `DELETE FROM legal_journal`** — which the per-row trigger should block. Either the trigger is being bypassed (RLS/superuser path) or this is broken in dev. Reconcile.

### 2.2 Sécurisation — closure bulletins, audit trail, software events

- Closure bulletins: signed (`generateClosureHash`), per-period uniqueness enforced (`2026_04_29_18_00_00_a3_constraints_hardening.sql` L118-119), closed bulletins immutable via trigger. **OK.**
- Audit trail: `establishment_id NOT NULL` enforced; `AuditTrailModel.logAction` resolves tenant from `user_id` if not provided. **OK** with two caveats below.
- **(P1) `logClosure` is dead** — `MuseBar/backend/src/models/legalJournal/journalOperations.ts` L132-154 is the only reference. Closures are not appended to the signed journal stream as `CLOSURE` rows. If you want a single auditable stream, wire it from `closureOperations.ts` after the bulletin is persisted.
- **(P0) No "software events" journal.** Boot, shutdown, time change, software update, config change events are not appended anywhere as fiscal journal entries. NF525 expects this; "Article 286-I-3 bis" baseline doesn't strictly require it but a strong compliance posture does.
- **(P1) `POST /api/orders/audit/log` audit-actor forgery.** `orderAudit.ts` L18-26: `userId` is read from `req.body`, not bound to `req.user.id`. Authenticated callers can write audit rows attributed to other users in their establishment. (Plus this endpoint only requires `requireAuth` — no granular permission gate.)
- **(P2) `SetupAuditManager` swallows audit failures** ("shouldn't break setup"). Pragmatic for the wizard; loose for strict compliance.

### 2.3 Conservation — receipts, invoices, archive

- Receipts: `printDataRepo.ts` joins `legal_journal` for `sequence_number` and `current_hash` — receipts can be reproduced and re-verified. **OK.**
- **(P1) Thermal receipt body lacks the statutory mention.** `BasePrintingService.generateReceiptContent` (L70-168) renders only thanks + cut. The closure-bulletin printer footer does include `Ref. legale: Article 286-I-3 bis du CGI` (L271-274), and the email receipt mentions it (`EmailReceiptService.ts`). The thermal ticket is the customer-facing artefact and should match.
- **(P1) Invoices (factures) do not exist.** The codebase only models receipts (`ticket de caisse`). For B2B sales above the invoice threshold (€25 incl. VAT, or on customer request), French law mandates a real `facture` with sequential numbering, full party identification, and itemized VAT. If your buyers are pure-B2C bars/clubs, this is fine; for restaurants and any B2B reseller, this is a missing surface.
- **(P0) `POST /api/legal/archive/:id/export` is a placeholder pretending to succeed.** `archive.ts` L122-142: returns `message: 'Archive exported successfully'` with `note: 'Export functionality to be implemented'`. Either gate behind 501 / `Feature-Not-Implemented` or wire it.
- **(P1) `ArchiveService.generateExportContent` does not handle `ANNUAL`.** The `switch` covers `DAILY` / `MONTHLY` / `FULL` only (`archiveService.ts` L145-234). `ANNUAL` likely falls through with empty payload and no warning.
- **(P1) `convertToPDF` is a stub** (`archiveService.ts` L312-315) returning placeholder text.
- **(P1) `DAILY` archive export side-effect.** `archiveService.ts` L151 calls `LegalJournalModel.createDailyClosure` from the export pipeline. Creating fiscal closure state from "export" is a surprising side effect that interacts badly with operator-driven closure discipline and the new uniqueness constraint.

### 2.4 Archivage — multi-tenancy + RLS

- RLS migration in `2026_04_24_00_00_00_row_level_security_tenant_isolation.sql` defines `app_current_establishment_id()` reading `current_setting('app.establishment_id', true)`.
- Per-request `pool.query` is wrapped: `BEGIN; SET LOCAL app.establishment_id; <query>; COMMIT;` (`app.ts` L91-117). `requireAuth` runs handlers inside `runWithTenantContext({ establishmentId })` (`middleware/auth.ts` L93).
- **(P1) `GET /api/printing/epson/poll` runs without tenant context.** The route is unauthenticated by design (the printer polls it), but the handler then queries `printing_configurations` — which RLS forces. Either rows return empty (broken integration) or someone "fixes" it with a global bypass and creates a cross-tenant read footgun. The right answer is a dedicated DB role + scoped `SET LOCAL app.establishment_id` derived from the validated `establishment_id` query parameter after HMAC.
- **(P2) `establishments` table has no RLS policy** in the RLS migration. Acceptable for a SaaS operator model but worth documenting explicitly.

---

## 3. Security posture — beyond what April 23 covered

### Authentication / sessions

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S1 | P1 | Concurrent refresh races: new token issued before old one is revoked. Two parallel `POST /refresh` calls can both succeed. | `authLogin.ts` L209-212 (issue) → L222-226 (revoke after audit) | Per-user serialization (DB row lock or `pg_advisory_xact_lock`) on refresh; or one-time refresh handle. | M |
| S2 | P1 | Login does not revoke prior sessions. Old tokens stay valid up to 7d after re-login. | `authLogin.ts` L122-125 | Optional "kick all sessions" on login (per-user `jti` table, or session-version claim in JWT). | M |
| S3 | P2 | JWT payload still carries legacy `is_admin`. `requireAdmin` correctly checks `role === 'system_admin'`, but `is_admin` invites future misuse. | `middleware/auth.ts` L85-91; `authLogin.ts` `deriveRole` L64-76 | Drop `is_admin` from new tokens after one rollover; doc "role is authoritative". | S |
| S4 | P2 | Setup endpoint has no password strength check. `requireSetupSecret` is good (timing-safe), but body validation only checks presence. | `authRegister.ts` L274-279 | Reuse `validatePassword`. | S |

### Authorization / permissions

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S5 | P1 | `establishment_admin` implicitly receives every permission name in the registry. | `models/user.ts` L98-107 (`getUserPermissions` short-circuits to `Object.values(P)`) | Explicit `user_permissions` rows (with seed) — or document this as the intended model and add a "least-privilege" alternative role. | L |
| S6 | P1 | `GET /api/legal/business-day-stats` is gated by `requireAuth` only — no granular permission. Reveals current-day TTC, card/cash split, top products to any logged-in user. | `routes/legal/businessDayStats.ts` L16-24 | Add `requirePermission(P.access_pos)` or `P.access_compliance` (product call). | S |
| S7 | P1 | `POST /api/orders/audit/log`: only `requireAuth`; `userId` taken from `req.body` → audit-actor forgery. | `routes/orders/orderAudit.ts` L18-40 | Force `user_id = req.user.id`; add `requirePermission(P.access_pos)`. | S |
| S8 | P2 | `GET /api/legal/journal/stats` combines `requireAdmin` (= `system_admin`) **and** `getEstablishmentId` (requires non-null `establishment_id`). `system_admin` users have `establishment_id: null` → 403 unless impersonating. The combo is broken in normal use. | `routes/legal/journal.ts` L86-88 | Either split into "system stats" (no establishment scope) and "establishment stats" (different gate), or change the role/scope contract. | M |
| S9 | P2 | `GET /api/legal/journal/entries` and `/verify` use `access_compliance`, but `/stats` uses `requireAdmin`. Permission story is inconsistent across the same router. | same file | Pick one model and apply uniformly. | S |

### Multi-tenancy / RLS

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S10 | P1 | Unauthenticated Epson poll vs RLS — rows are filtered out unless someone toggles bypass globally. | `routes/printing.ts` `epsonPollHandler.ts`; RLS migration L79-86 (FORCE RLS) | Dedicated low-privilege DB role for poll; resolve `establishment_id` from validated query param + HMAC; `SET LOCAL app.establishment_id` per request. | M |

### Surface / exposure

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S11 | P2 | Swagger try-it-out enabled in dev *and* if `SWAGGER_ENABLED=true`. | `app.ts` L168-171; `routes/docs.ts` L12-42; `config/environment.ts` L217-221 | Force-disable try-it-out in production regardless of env override; serve docs only behind VPN/mTLS. | S |
| S12 | P2 | Login is on the global rate-limit bucket (default 500 / 15 min per IP). No login-specific bucket. | `middleware/security/RateLimitMiddleware.ts` L44-55, L110-133 | Stricter limiter on `POST /api/auth/login` (and `/refresh`, future password reset) keyed by IP + email hash. | M |
| S13 | P2 | `/api/client-errors` accepts unbounded body in development and logs it; no per-key redaction. | `app.ts` L177-220 | Cap body size; redact in dev logger. | S |
| S14 | P2 | Request-logger redaction list misses `x-setup-secret` and `x-client-error-key`. | `middleware/requestLogger.ts` L104-121 | Add both headers to the redaction list. | S |

### Logging hygiene

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S15 | P2 | `process.stderr.write` in `routes/legal/businessDayStats.ts` L74 and `models/auditTrail.ts` L63 instead of `Logger`. | files | Replace with `Logger.getInstance().error(...)`. | S |

### Frontend

| ID | Sev | Finding | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S16 | P2 | Access token in `localStorage` (`auth_token`). Any XSS exfiltrates the JWT. | `MuseBar/src/hooks/useAuth.ts` L30-33, L86-87, L130-133 | Long-term: httpOnly cookies + CSRF strategy. Short-term: tighter CSP. | L |
| S17 | P2 | `useAuth.refresh` calls `POST /auth/refresh` without body → server treats `rememberMe` as falsy → 12h token even if user picked 7d. | `useAuth.ts` L83 vs `authLogin.ts` L197-198, L211-212 | Pass `{ rememberMe }` consistently. | S |
| S18 | P2 | Swagger UI `requestInterceptor` reads `localStorage.getItem('authToken')` but the app stores under `auth_token`. | `routes/docs.ts` L23-27 vs `useAuth.ts` L30 | Align key name. | S |

---

## 4. Code quality / cleanup

### 4.1 Dead / legacy / orphan

| ID | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| Q1 | P1 | `logClosure` defined but never called. | `models/legalJournal/journalOperations.ts` L132-154 (only ref) | Wire it from `closureOperations.ts`, or delete. |
| Q2 | P2 | `MuseBar/backend/src/controllers/` is empty. | `ls` returns 0 files | Delete the directory; routes-as-thin-controllers is the model. |
| Q3 | P1 | Two `useHappyHour` hooks with the same export name. | `MuseBar/src/hooks/useHappyHour.ts` and `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts` | Rename one to remove ambiguity. |
| Q4 | P2 | Stale comment in `errorHandler.ts` L1-5 references a removed `errorHandling.ts`. | file | Trim header. |
| Q5 | P2 | `backend/src/db/` contains only `tenantContext.ts`. Folder name suggests "DB layer" but it's only RLS context. | `backend/src/db/` | Either rename (e.g. `rls/`) or document. |

(No unreferenced dead modules other than the above were found via static reference checks. A `knip` / `ts-prune` pass is recommended to be exhaustive — see §7.)

### 4.2 Single source of truth (SSOT) drift

| ID | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| Q6 | P1 | Permission strings are defined in `permissions/registry.ts` on the backend but **hard-coded as literals** in `MuseBar/src/components/common/AppRouter.tsx` (`'access_pos'`, `'access_menu'`, …). | files | Share via `@mosehxl/types` (or new `@mosehxl/permissions`) and import on both sides. CI grep test that frontend literals ⊆ registry. |
| Q7 | P1 | Two parallel role systems coexist: backend `deriveRole` maps legacy `admin`/`cashier`/`is_admin` to `establishment_admin`/`staff`/`system_admin` (`authLogin.ts` L53-69); user-management role catalog (`routes/userManagement/roles/rolePermissions.ts`) still defines `admin`, `manager`, `staff`, `cashier` as distinct entities. | files | Document the boundary clearly OR converge identifiers. Today there is no test enforcing that the two vocabularies stay consistent. |
| Q8 | P1 | `Order` / `OrderItem` / `SubBill` come from `@mosehxl/types` for the wire contract, but the POS UI uses a different camelCase shape in `MuseBar/src/types/orders.ts`. The mapping happens in `services/api/orders.ts`. | files | Document the boundary in the architecture doc (wire DTO vs view model); add a unit test on the mapper. |
| Q9 | P2 | Currency formatting: shared `MuseBar/src/utils/formatCurrency.ts` exists, but `components/HappyHour/HappyHourControl/useHappyHour.ts` inlines `` `€${amount.toFixed(2)}` ``. | files | Replace with `formatCurrency`. |

### 4.3 Modular architecture / separation of concerns

| ID | Sev | Finding | Evidence | Action |
|---|---|---|---|---|
| Q10 | P2 | Routes import `pool` from `../../app` (e.g. `routes/orders/orderCRUD.ts` L11, `routes/printing.ts`, `routes/enhancedEstablishments.ts`, `routes/authLogin.ts`, `routes/userManagement/roles/roleQueries.ts`). | `rg "from '\.\./\.\./app'"` | Move `pool` to a dedicated `db/pool.ts`; export from there. Reduces circular-import risk and makes routes easier to test. |
| Q11 | P2 | `orderCRUD.ts` POST handler holds order create + journal compensation + audit logic inline. | `routes/orders/orderCRUD.ts` L130-230 | Extract a `CreateOrderTransaction` service (or model method) so the route is HTTP-only. |
| Q12 | P1 | `orderAudit.ts` uses raw `async (req, res)` + `res.status(500).json({...})` instead of `asyncHandler` + `AppError`. | `routes/orders/orderAudit.ts` L18-50, L57-79, L86-122 | Wrap in `asyncHandler`, throw `AppError`, drop manual 500 returns. |
| Q13 | P2 | Other routes still use ad-hoc `res.status(500).json({ error })` outside the unified handler: `routes/establishmentSearch.ts`, `routes/adminDashboard.ts`, `routes/printing.ts`, `routes/enhancedEstablishments.ts`, `routes/settings.ts`, `routes/setup.ts`, parts of `routes/legal/archive.ts` (export route) and `routes/orders/orderCRUD.ts` (journal compensation path). | `rg "res\.status\(500\)"` | Sweep them onto `asyncHandler` + `AppError` for a consistent `{ success: false, error: { code } }` payload. |

### 4.4 Comments / annotations accuracy

- Sampled critical files (`orderCRUD.ts`, `orderLegal.ts`, `archive.ts`, `journal.ts`, `errorHandler.ts`, `auditTrail.ts`, `journalSigning.ts`, `journalOperations.ts`, `app.ts`): comments are accurate **except** the items called out above (`errorHandler.ts` header; `archive.ts` placeholder export contradicting its own response copy; `orderAudit.ts` comments imply a regulator-grade endpoint while the code accepts forged actors).
- Patch-note bodies are largely accurate, but the historical ones (`patch-notes/15`) speak in the present tense for things that are no longer true. See §6.

### 4.5 TypeScript strictness signals

- No `\bas any\b` in `routes/` (good).
- `as unknown as <T>` casts present in a handful of DB-boundary files (`routes/userManagement/roles/roleQueries.ts`, `routes/legal/closure.ts`). Acceptable for now; consider typed DB helpers later.
- Several routes consume `req.body` without schema validation (e.g. `routes/legal/archive.ts` L131). `validateBody` exists in `middleware/validation.ts` — extend coverage.

---

## 5. Tests

- The April 23 plan finished with 19 passes of route-level test expansion. Coverage of legal/printing routes is now strong on permission gating, tenant scoping, input validation, and error contracts.
- Gaps that should be the next test work:
  - End-to-end "refund / change / tip-reversal journal fail-safe" tests once §2.1 is fixed.
  - Concurrent-refresh test (S1) — assert only one of two concurrent refreshes succeeds.
  - Audit-actor forgery test (S7) — assert `userId` from body is ignored.
  - `business-day-stats` permission gate test (S6).
  - Dynamic CORS callback unit test (allowed list, regex dev path, non-Origin callers).

---

## 6. Documentation truth alignment

| ID | Sev | File | Issue | Action |
|---|---|---|---|---|
| D1 | P1 | `DEVELOPMENT-STATE.md` L114 | Known issue #9: "stubs return empty arrays" — but `orderAudit.ts` is wired. | Mark resolved; remove or strikethrough the entry. |
| D2 | P1 | `DEVELOPMENT-STATE.md` L131-146 | "Migration chain (12 files)" — actual count is 28 in `migrations/files/`. | Replace with `npm run migration:status` pointer + categories. |
| D3 | P2 | `DEVELOPMENT-STATE.md` L116 | Printer settings path listed as `components/Settings/PrinterSettings.tsx`; actual is `components/Settings/Settings/PrinterSettings.tsx`. | Fix path. |
| D4 | P1 | `docs/00-TABLE-OF-CONTENTS.md` L8 + body | Claims "every fix has its patch notes"; structured index stops at #57 while the folder has 170+ files. | Either label the index as a sample, or extend it. |
| D5 | P1 | `docs/course/10-MULTI-TENANT-AND-MUSE-POS-ACCESS.md` L12, L50, L74-75, L89-95 | Still teaches `role = 'cashier'`; auth migration (`2026_04_22_00_00_00_auth_roles_admin_separation.sql` L17-24) maps `cashier → staff`. Contradicts course chapter 06. | Rewrite SQL examples to `staff`; add note on the migration. |
| D6 | P2 | `docs/course/05-DATABASE.md` L241, L381 | Same `cashier` role wording in samples. | Update or label "pre-migration legacy". |
| D7 | P2 | `docs/course/06-AUTH-AND-SECURITY.md` L73-92 | JWT payload examples still show `is_admin: true`. | Annotate "legacy field; `role` is authoritative" or remove from examples. |
| D8 | P2 | `docs/course/07-LEGAL-COMPLIANCE.md` | Compliance narrative is overstatement-prone if read alone. | Cross-link to the hard-copy audits and add a "not certification-ready" paragraph. |
| D9 | P1 | `docs/patch-notes/15-SCHEMA-CREATION-DIVERGENCE-FIX.md` L9-13 | Body still says "we use one schema per establishment" in present tense. V2 is shared-table. | Add a "HISTORICAL — superseded" banner to the body, not just the TOC summary. |
| D10 | P2 | `docs/patch-notes/170-NONBLOCKING-9-ORDER-AUDIT-READ-WIRING-PLAN.md` L8-12 | Plan still says current state is stubbed; implementation #171 closed it. | Annotate plan as historical or remove. |
| D11 | P2 | `README.md` ISCA pillar table L122-127 | Reads as "implemented" without the cautious framing the audits use. | Soften wording or link to the hard-copy audits. |
| D12 | P2 | `README.md` L57-61 | "ApiService is the main facade" is half-true; `services/api/core.ts` and per-domain modules also exist. | Rewrite paragraph. |

---

## 7. Prioritized action plan (P0 → P1 → P2)

### P0 — must fix before any compliance claim hardens

1. **L1 — Refund / change / tip-reversal journal fail-safe parity with SALE.**
   - Files: `MuseBar/backend/src/routes/orders/orderChange.ts`, `MuseBar/backend/src/routes/orders/orderCancel.ts`.
   - Apply the P0-2 pattern: failure of `LegalJournalModel.logChange` / `addEntry('REFUND', …)` rolls back the order(s) and returns 500.
   - Add regression tests mirroring `orderCRUD.journalFailSafe.test.ts`.
2. **L2 — Stop the archive export route from lying.**
   - File: `MuseBar/backend/src/routes/legal/archive.ts` L122-142.
   - Either return `501 Not Implemented` with a clear `code`, or wire it to `ArchiveService.generateExportContent` + `convertToPDF` once §3.3 below is done.
3. **L3 — Decide the "software events" journal stance.**
   - If you intend NF525-style completeness: design and implement `legal_journal` `SOFTWARE_EVENT` rows for boot, shutdown, time change, software update, configuration change. Hook into app bootstrap, settings change, time-config drift detector.
   - If not: explicitly scope the compliance claim to "Article 286-I-3 bis baseline" in `README.md` and `docs/course/07-LEGAL-COMPLIANCE.md`.
4. **L4 — Wire `logClosure` into closure flows.**
   - File: `MuseBar/backend/src/routes/legal/closure.ts` (or the model used after a bulletin is persisted).
   - On every bulletin write, append a `CLOSURE` entry with the bulletin hash and totals.
5. **L5 — Remove or gate `verifyJournalIntegrity`'s silent-skip logic.**
   - File: `MuseBar/backend/src/models/legalJournal/journalSigning.ts` L67-105.
   - Either delete the `sequence_number === 128` / `CORRECTION` shortcut, or guard it behind a feature flag and log a structured warning every time it fires.

### P1 — close before promoting "production-grade" claims

- **S1 — Concurrent refresh serialization** (`authLogin.ts`): `pg_advisory_xact_lock(user_id)` around the rotate.
- **S2 — Optional "kick prior sessions" on login.**
- **S5 — Reconsider implicit `establishment_admin` permission grant** or document it as deliberate and add a "least-privilege" alternative.
- **S6 — Add `requirePermission` to `GET /api/legal/business-day-stats`.**
- **S7 — Bind `user_id` from session in `POST /api/orders/audit/log`** and add a permission gate.
- **S8 — Resolve `journal/stats` `requireAdmin` + `getEstablishmentId` mismatch.**
- **S10 — Epson poll RLS strategy** (dedicated DB role; per-request `SET LOCAL`).
- **L6 — Thermal receipt body must include `Article 286-I-3 bis du CGI`** mention.
- **L7 — `ArchiveService.generateExportContent`: add `ANNUAL` case + remove daily-export side effect** (closure creation should be its own endpoint).
- **L8 — Real `convertToPDF`** (or remove it from the API).
- **Q3 — Resolve `useHappyHour` name collision.**
- **Q6 — Share permission strings between backend `registry` and frontend `AppRouter`.**
- **Q7 — Document or converge the two role vocabularies.**
- **Q8 — Document the wire-DTO vs view-model boundary for `Order`.**
- **Q12 — Wrap `orderAudit.ts` in `asyncHandler` + `AppError`.**
- **D1, D2, D4, D5, D9 — Doc rewrites.**

### P2 — ongoing hygiene

- **S3, S4, S9, S11, S12, S13, S14, S15, S16, S17, S18.**
- **L9 — Make journal append transactional / serializable + retry.**
- **L10 — Reconcile `resetJournalDevOnly` vs the immutability trigger** (either drop+recreate trigger inside the dev-only path, or keep the path but add an explicit assertion that it runs as superuser/RLS-bypass).
- **Q1, Q2, Q4, Q5, Q9, Q10, Q11, Q13.**
- **D3, D6, D7, D8, D10, D11, D12.**
- Add `knip` / `ts-prune` to CI for an automated orphan-module signal.

---

## 8. Recommended compliance claim wording (until P0 items close)

> MOSEHXL implements an architecture aligned with French fiscal Article 286-I-3 bis du CGI for cash registers — per-establishment hash-chained legal journal, signed daily/weekly/monthly/annual closure bulletins, immutable audit trail, tenant isolation by Row Level Security, and signed archive exports. **No NF525 / LNE certification is claimed.** Refund and cash-change journal fail-safety, software-events journaling, and archive PDF export are tracked as open compliance items in `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md`.

Use this in `README.md` and `docs/course/07-LEGAL-COMPLIANCE.md` as the canonical sentence.

---

## 9. Closing note

The April 23 plan was executed end to end and the foundations hold. The three things that, if closed, would actually move the needle on a defensible compliance posture are:

1. **L1** — bring REFUND / CHANGE journal writes up to the same fail-safe contract as SALE.
2. **L2 + L7 + L8** — make `archive` actually export instead of pretending to.
3. **L3 + L4 + L5** — tie closure events into the signed stream and stop the verifier from skipping its own findings.

Everything else is real but secondary. Recommend tackling the P0 list first, in that order, with the same plan-then-implement-then-document MO that worked for the April 23 plan.
