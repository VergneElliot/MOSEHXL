# MOSEHXL — Full Repo State Audit (hard copy)

**Date:** 2026-05-20  
**Branch:** `development` (HEAD `41e915c` after cherry-picking P2-L10 + 3 ops fixes from `main`)  
**Predecessors:** `2026-04-29-full-repo-state-audit-hard-copy.md`, `2026-04-23-full-repo-state-audit-hard-copy.md`  
**Audit pillars:** 1) Inventory & modularity, 2) Legal/NF525 compliance, 3) Security, 4) Code quality & tests.  
**Style:** "no leaves left unturned" / hard truth, prioritized into P0 (blockers), P1 (must-fix before certification claim), P2 (quality/hardening).

---

## 0. Executive verdict (hard truth)

1. **NF525 self-certification readiness: NO.** The system is **architecturally aligned with CGI Article 286-I-3 bis** and materially stronger than the April 29 snapshot, but **not** filable as a NF525 self-certification dossier today. Specific blockers: auto-closure path does not append to the legal journal; manual closure journal append is best-effort (bulletin can exist without `CLOSURE` entry); software events are best-effort with swallowed failures; archive verify/download have no HTTP surface (and `POST .../export` returns 501); 6-year conservation policy is text-only; register identifier is a global string (`MUSEBAR-REG-001`) instead of per-establishment/per-register. `docs/course/07-LEGAL-COMPLIANCE.md` itself explicitly disclaims NF525/LNE certification today.
2. **Professional code standards: MIXED, trending good.** Backend strictness, CI, and the unified `AppError` + `asyncHandler` pattern are in solid shape on the **mounted** route surface. The largest quality debts are (a) `userManagement/roles/*` is ~800+ LOC of code that is **exported but never mounted** (dead API surface), (b) `routes/orders/orderCancel.ts` and `routes/legal/closure.ts` are fat route modules (>400 LOC each) still doing business logic, (c) `journalQueries.ts` is a ~608 LOC god module on the fiscal critical path, (d) `db/pool.ts` is still a 7-line re-export of `app.ts` so most models/services keep importing the pool from `app` (P2-Q10 was structural only), and (e) front-end observability/i18n are weak (~25 `console.error` sites, no `react-i18next`, ~50 `any` occurrences).
3. **Security posture: SOLID FOUNDATIONS, REAL GAPS.** Many items from the April 29 audit are confirmed fixed (refresh serialization, prior-session kick, per-route auth limits, Swagger try-it-out off in prod, log redaction expanded, `business-day-stats` gated on `access_compliance`, `orderAudit` actor from session). The remaining material gaps are: **JWT in `localStorage` with 12h/7d TTL** (this is the P2-S16 long-term token hardening item, now formally tracked below), **production DB TLS verification defaults OFF** (`DB_SSL_REJECT_UNAUTHORIZED` defaults `false`), **`POST /api/auth/users` and `/api/auth/register` skip `validatePassword`**, **no password reset/change API** (`authPassword.ts` is an empty placeholder), **`access_user_management` can promote peers to `establishment_admin`**, **no 2FA / account lockout / breach check**, **Epson poll `?key=` query fallback** still in code.

> Bottom line: this is now a credible **fiscal-aligned, multi-tenant POS** with substantial recent hardening. It is **not** "no leaves unturned" for NF525 self-certification, and security has one structural cleanup left (tokens) plus several focused gaps. Code is no longer monolithic in spirit, but the lingering fat fiscal modules and the unmounted role API are the most visible legacy.

---

## 1. NF525 readiness verdict per pillar

| NF525 pillar | Verdict | Why |
|--------------|---------|-----|
| **Inaltérabilité** | **Partial** | Hash chain + SERIALIZABLE append (P2-L9) + strict integrity verifier (P0-L5) + UPDATE/DELETE trigger are strong. Gaps: no DB-level hash binding on INSERT; TRUNCATE/COPY paths not denied; `SET LOCAL session_replication_role = 'replica'` is now used (P2-L10) for the dev-only reset — gated by production guard, but worth documenting in the operator runbook. |
| **Sécurisation** | **Partial** | Audit trail + granular permissions + software events wired across boot/shutdown/users/establishments/time/version (P0-L3.x). Gaps: software events are **best-effort** (`logSoftwareEventBestEffort` swallows failures); typed as `CORRECTION` rather than a dedicated NF525 transaction type; `establishment_admin` is `implicit_all` by default unless `ESTABLISHMENT_ADMIN_PERMISSION_MODE=explicit_only`. |
| **Conservation** | **Partial** | Closures + receipts + journal retention in DB. Gaps: closure totals are computed from `orders`, not reconciled against journal `SALE` sums; `WEEKLY` closure type exists but isn't in the NF525 daily/monthly/annual set; B2B factures are not implemented. |
| **Archivage** | **Partial** | Signed exports (HMAC-SHA256), real PDF (P1-L8), ANNUAL archive + read-only DAILY (P1-L7), tenant-scoped list/get/verify. Gaps: `POST /api/legal/archive/:id/export` returns **501**; `verifyArchiveExport` and `downloadArchiveExport` have **no HTTP routes**; exports stored on local disk only; 6-year retention is text in `compliance.ts` with no enforcement; "digital signature" is HMAC-with-shared-secret, not a qualified signature. |

**Required to claim self-certification (beyond items below):** explicit scope decision (B2C tickets only vs full NF525), référentiel mapping document, independent test plan & evidence corpus, production controls (WORM/off-site backups, retention jobs), attestation/declaration on file.

---

## 2. Audit task list (prioritized)

The IDs follow the existing audit convention: **P0/P1/P2** = priority, **L/S/Q/D** = pillar (Legal / Security / Quality / Docs). Effort: S (≤1d), M (1–3d), L (>3d).

### P0 — Compliance blockers (must close before any self-certification claim)

| ID | Title | Why it's a P0 | Effort |
|----|-------|---------------|--------|
| **P3-L1** | Auto-closure must append `CLOSURE` to the legal journal | **Fixed (2026-05-20):** scheduler closure path now appends `CLOSURE` entries through `LegalJournalModel.logClosure`; patch notes `264/265`, commit `1838995`. | **S** |
| **P3-L2** | Make closure bulletin + journal atomic (no swallow) | **Fixed (2026-05-27 follow-up):** manual and scheduler closure paths now fail closed: journal append failure triggers open-bulletin rollback and aborts closure (`LEGAL_CLOSURE_JOURNAL_APPEND_FAILED` / `AUTO_CLOSURE_JOURNAL_APPEND_FAILED`); finalize happens only after successful append (patch notes `268/269`, `360/361`). | **M** |
| **P3-L3** | Software events: fail-safe (or mandatory retry queue) for critical types | **Fixed (2026-05-20):** critical software events now use fail-safe journaling with retry semantics; silent swallow path removed for critical event flow. | **M** |
| **P3-S1** | Production DB TLS: default `rejectUnauthorized: true` | **Fixed (2026-05-20):** production DB TLS verification defaults to `sslRejectUnauthorized=true` unless explicitly overridden for non-production self-signed workflows. | **S** |
| **P3-S2** | Enforce `validatePassword` on every password-setting path | **Fixed (2026-05-20):** `/api/auth/register`, `/api/auth/users`, and establishment account creation paths enforce shared `validatePassword` policy. | **S** |
| **P3-S3** | Restrict `establishment_admin` role grant to actual admins | **Fixed (2026-05-20):** only system admins can grant `establishment_admin`; user-management permission alone can no longer escalate tenant admins. | **M** |

### P1 — Must-fix before customer-facing certification claim or external SOC2-style review

| ID | Title | Rationale | Effort |
|----|-------|-----------|--------|
| **P3-L4** | Block UPDATE/DELETE *and* TRUNCATE on `legal_journal` | **Fixed (2026-05-20):** added DB-level deny trigger for `TRUNCATE` in addition to existing row-level immutability protection. | **M** |
| **P3-L5** | DB-level hash chain enforcement on INSERT | **Fixed (2026-05-20):** DB trigger now recomputes and validates sequence/`previous_hash`/`current_hash` on insert to prevent direct-write chain corruption. | **M** |
| **P3-L6** | Expose archive verify + download HTTP routes; drop or implement `POST .../export` (currently 501) | **Fixed (2026-05-20):** archive verify/download routes are exposed; legacy `/archive/:id/export` now works as a functional download alias instead of 501. | **S** |
| **P3-L7** | Unify register identifier across journal and receipts | **Fixed (2026-05-20):** register identifier unified to establishment-scoped `CR-<establishment_id>` across journal, receipts, and archive paths. | **M** |
| **P3-L8** | Reconcile closure bulletin totals against journal `SALE` sums | **Fixed (2026-05-21):** closure generation now compares order-derived totals with legal journal `SALE` aggregates and persists discrepancy flags/details on closure bulletins. | **M** |
| **P3-L9** | Implement password reset + change API + global session revoke on password change | **Fixed (2026-05-20):** `/auth/password/forgot|reset|change` endpoints implemented and wired with global session revoke/cutoff on password lifecycle events. | **M** |
| **P3-S4** | Implement P2-S16 token long-term hardening — Phase 1 | **Fixed (2026-05-21):** access tokens reduced to 15m, opaque refresh tokens persisted in DB with rotation and revoke-on-password-change. Cookie/BFF move remains in P3-S5. | **L** |
| **P3-Q1** | Stop the closure-journal swallow (`closure.ts:65-71`) | **Fixed (2026-05-21):** closure creation now fails closed with rollback/delete of open bulletins and propagated `LEGAL_CLOSURE_JOURNAL_APPEND_FAILED` errors. | **S** |
| **P3-Q2** | Delete or mount `userManagement/roles/*` (~800+ LOC unmounted) | **Fixed (2026-05-21):** removed unmounted `routes/userManagement/roles/*` module to eliminate dead API surface. | **M** |
| **P3-Q3** | Extract `orderCancel` god handler (~380 LOC) into a service | **Fixed (2026-05-21):** cancellation business logic extracted into `services/orders/orderCancellationService.ts`; route reduced to transport/middleware concerns while preserving fail-closed legal journaling behavior. | **L** |
| **P3-Q4** | Split `journalQueries.ts` (~608 LOC) by concern | **Fixed (2026-05-21):** split into `journalAppend.ts`, `journalRead.ts`, `journalDevReset.ts`, and `journalStats.ts` with `JournalQueries` kept as a compatibility facade for existing callers. | **M** |
| **P3-Q5** | Finish the `db/pool.ts` decoupling | **Fixed (2026-05-21):** `db/pool.ts` now owns pool creation + tenant-context wrapping, and pool consumers/tests were migrated off `app.ts` imports. | **M** |
| **P3-Q6** | Wrap `userManagement/invitationRoutes.ts` and `establishmentAccountCreation/index.ts` in `asyncHandler` | **Fixed (2026-05-21):** async route handlers are now wrapped in `asyncHandler`, with manual `next(error)` forwarding replaced by throw-based propagation to unified error middleware. | **S** |
| **P3-Q7** | Add a real-DB Vitest project for compliance assertions | **Fixed (2026-05-21):** added an opt-in `real-db` Vitest project and runtime compliance assertions for legal-journal immutability (UPDATE/DELETE blocked) and tenant visibility isolation checks. | **L** |
| **P3-T1** | Restore backend test suite (workspace dep + mock drift + AppError envelope drift) | **Fixed (2026-05-20):** backend suite stabilized (`@mosehxl/types` dependency declaration, software-event mock parity, updated AppError envelope assertions, printing error-message leak patch); patch notes `266/267`. | **S** |

### P2 — Hardening / code quality (improves grade, not certification-blocking)

| ID | Title | Rationale | Effort |
|----|-------|-----------|--------|
| **P3-S5** | Move tokens from `localStorage` to httpOnly cookie or BFF (part of P2-S16) | **Fixed (2026-05-21 + follow-ups):** refresh token transport moved to httpOnly cookie and frontend token persistence removed from localStorage; refresh endpoint enforces cookie-only token source (`364/365`), CSRF double-submit (`367`), and `HS256` verify-algorithm pinning (`369`); refresh reuse detection now revokes token family + access-token cutoff (`371`). BFF-level hardening remains tracked separately. | **L** |
| **P3-S6** | Account lockout after N failed logins + admin unlock | **Fixed (2026-05-21 + follow-up):** DB-backed failed-attempt lockout with progressive duration and establishment-scoped admin unlock endpoint + audit coverage; refresh path now also blocks inactive/locked accounts and revokes refresh sessions (`373`). | **M** |
| **P3-S7** | Optional HIBP k-anonymity check on set-password paths | **Fixed (2026-05-21):** shared breach-aware validator integrated with HIBP k-anonymity and wired into password set/reset/change flows (opt-in via env). | **S** |
| **P3-S8** | 2FA (TOTP) for `system_admin` and `establishment_admin` | **Fixed (2026-05-21 + follow-up):** added admin TOTP lifecycle endpoints and login-time step-up enforcement (env-controlled, production-secure default) for admin roles; support impersonation start now also requires TOTP step-up (`375`). | **L** |
| **P3-S9** | Drop Epson poll `?key=` query fallback (`epsonPollHandler.ts` L48-51) | **Fixed (2026-05-21):** removed query fallback and enforced header-only `x-epson-poll-key` auth for Epson Server Direct poll requests. | **S** |
| **P3-S10** | `requirePermission(P.access_pos)` (or `access_compliance`) on `GET /api/orders/audit/:orderId` | **Fixed (2026-05-21):** endpoint now requires `access_pos` or `access_compliance` via `requireAnyPermission`. | **S** |
| **P3-S11** | Default `ESTABLISHMENT_ADMIN_PERMISSION_MODE=explicit_only` in production | **Fixed (2026-05-21):** production fallback now resolves to `explicit_only` when unset, while preserving explicit overrides and non-production `implicit_all` default. | **S** |
| **P3-S12** | `timingSafeEqual` for prod client-error key compare (`app.ts` L212-214) | **Fixed (2026-05-21):** production client-error key validation now uses length-checked `crypto.timingSafeEqual` via shared helper. | **S** |
| **P3-S13** | Audit `establishment_id IS NULL` (`system_admin`) paths against RLS policies | **Fixed (2026-05-21):** real-db compliance tests now assert null tenant context cannot read or insert tenant-scoped orders unless DB role has `BYPASSRLS`/superuser privileges. | **M** |
| **P3-S14** | Extend log redaction to `refresh_token`, `invitation_token` field names | **Fixed (2026-05-27 + follow-up):** request and client-error logging now explicitly redact `refresh_token`/`invitation_token` fields (including nested payload keys) plus `x-refresh-token` header; invitation-accept route error metadata no longer logs raw request token (`362/363`). | **S** |
| **P3-S15** | Frontend client-side logger that ships to `/api/client-errors` (currently dev-only) | **Fixed (2026-05-27):** centralized frontend logger now ships `console.error`/runtime/unhandled rejection events to `/api/client-errors` with optional report-key header and fail-safe handling. | **M** |
| **P3-Q8** | Pass 3 of unified error sweep: ad-hoc 4xx branches → `ValidationError`/`NotFoundError`/`AuthenticationError`/`AuthorizationError` | **Fixed (2026-05-27):** completed typed-error migration for auth, legal, printing, invitations, products, and setup routes with centralized error middleware handling. | **L** |
| **P3-Q9** | Add migration checksum (SHA-256 of UP) + verify on apply | **Fixed (2026-05-27):** migration manager now stores `up_checksum` on apply, verifies executed migrations against file checksums before running pending ones, and fails closed on checksum drift. | **M** |
| **P3-Q10** | Consolidate currency formatting through `formatCurrency` (or backend shared helper) | **Fixed (2026-05-27):** introduced shared backend `formatEuroAmount` helper and replaced inline euro formatting in printing/email receipt services; frontend legal receipt utilities already consume shared `formatCurrency`. | **S** |
| **P3-Q11** | Remove `services/SetupService.ts` shim and `services/setup/setupWizard.ts` legacy entry | **Fixed (2026-05-27):** removed setup/email shim wrappers and switched imports/exports to canonical module paths (`services/setup/SetupService`, `services/setup/wizard/SetupWizard`, `services/email/templates/EmailTemplateManager`). | **S** |
| **P3-Q12** | Expand `@mosehxl/types` and ban `any` in new frontend code | **Fixed (2026-05-27):** completed frontend runtime `any` cleanup in remaining compliance/audit/security UI paths, extended shared system types (`SecurityLogFilters`, `AuditTrailEntry`) for typed state/API payloads, and enforced `@typescript-eslint/no-explicit-any` for frontend code with test-only overrides. | **L** |
| **P3-Q13** | Toggle `noUncheckedIndexedAccess: true` in both tsconfigs | **Fixed (2026-05-27):** enabled in both frontend and backend `tsconfig.json` and resolved all resulting strict indexed-access regressions across route params, query parsing, scheduler/setup validators, dashboard metric accessors, and logging utilities. | **M** |
| **P3-Q14** | Remove `routes/authPassword.ts` empty placeholder once P3-L9 lands in the right place | **Fixed (2026-05-27):** `routes/authPassword.ts` is now a fully implemented password lifecycle router (forgot/reset/change), mounted via auth session routes and covered by dedicated route tests. | **S** |
| **P3-Q15** | Drop dual error stacks: pick `middleware/errorHandler.ts` and retire `utils/errors/standardErrorHandler.ts` if unused | **Fixed (2026-05-27):** verified `middleware/errorHandler.ts` is the sole active backend error path and removed unused legacy `utils/errors/standardErrorHandler.ts` exports to eliminate dual-stack ambiguity. | **S** |
| **P3-Q16** | Introduce `react-i18next` (or similar) with `fr`/`en` namespaces | **Fixed (2026-05-27):** integrated `react-i18next` with `fr/en` resources and `common`/`auth` namespaces, added language switcher persistence, and migrated core auth/header/loading UI strings to translation keys. | **L** |
| **P3-Q17** | Document `legal-schema.sql` vs `migrations/files/` drift policy | **Fixed (2026-05-27):** declared `migrations/files/*.sql` as canonical schema source, documented snapshot refresh/exemption rules, and added CI schema-drift enforcement (`check:schema-drift`) to fail when migration edits are not reconciled with snapshots. | **S** |
| **P3-Q18** | Backend coverage upload to Codecov | **Fixed (2026-05-27):** backend CI now runs tests with coverage (`vitest --coverage`), emits `coverage/lcov.info`, and uploads backend coverage to Codecov with dedicated backend flags. | **S** |
| **P3-D1** | Update `README.md` "Code Quality" claims to match reality | **Fixed (2026-05-27):** README now reflects current architecture truth (token model, pool ownership in `db/pool.ts`, modularization status with remaining large-file debt, and current audit source references). | **S** |
| **P3-D2** | Add a "current truth" doc that auto-references the latest patch-notes index | **Fixed (2026-05-27):** added `docs/CURRENT-TRUTH.md`, introduced auto-generated `docs/patch-notes/LATEST-INDEX.md` with root generation script (`npm run docs:patch-notes-index`), and linked both from documentation hubs for fast status lookup. | **M** |

---

## 3. P2-S16 — Long-term token hardening (formally tracked)

You explicitly requested this as a to-do for this audit. It is now **P3-S4 (P1)** at the top level, with the following ranked sub-tasks. **None of these block compliance, but they are required to stop calling tokens "OK enough" and start calling them production-grade for a multi-tenant SaaS POS.**

| Order | Sub-task | Notes |
|-------|----------|-------|
| 1 | **Short-lived access tokens (≤15 min) + opaque refresh tokens in DB** | Eliminates the "single JWT is both access and refresh, valid 12h–7d" failure mode. Refresh tokens become rotatable, revocable, and family-tracked. |
| 2 | **httpOnly `Secure` `SameSite=Strict` cookies (or BFF)** + CSRF double-submit on mutating routes | Removes `localStorage` token theft via XSS. Aligns with the P2-S18 / Swagger `auth_token` cleanup. |
| 3 | **Algorithm pin on `jwt.verify`** (`algorithms: ['HS256']` now; flip to `['RS256']` after migration) | Closes the algorithm-confusion class on the way to asymmetric signing. |
| 4 | **Asymmetric signing (RS256 or EdDSA) + `kid` header + JWKS rotation** | Secret compromise no longer forges tokens; supports multi-instance rotation. |
| 5 | **Global session revoke on password change** | Use `revokeAllUserTokensIssuedBefore(userId, now)`. Mandatory for P3-L9 (reset/change). |
| 6 | **Sliding refresh with an absolute session cap** (e.g. 30 days max even with `rememberMe`) | Limits "remember me forever" drift. |
| 7 | **Device/session record** (UA + stable client id; optional IP subnet) | Enables "log out other devices"; surface anomalous reuse. |
| 8 | **Anomaly signals** (geo/IP/UA delta) for admin endpoints, paired with 2FA | Operational detection. |
| 9 | **Retire legacy `is_admin` JWT claim** after max TTL elapses (7d) + metrics | Completes the P2-S3 rollover (`auth.ts` L81-84). |

**Current state to be honest about (updated):** phase 1 and cookie transport are in place (15m access JWT + DB-backed opaque rotating refresh tokens + refresh revoke on password reset/change + httpOnly refresh cookie, no localStorage token persistence), with refresh CSRF double-submit, `HS256` verify-algorithm pinning, and refresh family-revoke on reuse now landed. Remaining roadmap items are asymmetric signing/JWKS rollout and session/device anomaly controls.

---

## 4. What is already fixed since the April 29 audit (so we don't re-do it)

> **Update (2026-05-20):** Items marked **DONE** below were closed in this remediation round. Cherry-picks + audit landed under commits `ee37d25..1838995` on `development`; subsequent items are committed in chronological order.
>
> - **P3-L1** (auto-closure CLOSURE journal append) — **DONE** (commit `1838995`, patch notes 264 / 265).
> - **P3-T1** (restore broken backend test suite) — **DONE** (this round, patch notes 266 / 267).

This list is for posterity — verified during this audit, do not re-open.

| April 29 finding | Current state |
|------------------|---------------|
| Refund/change journal fail-safe | **Fixed** (`orderCancel.ts:327-378`, `orderChange.ts:62-83`) |
| Archive export endpoint lying about success | **Fixed** — verify + download HTTP routes are live; legacy `/archive/:id/export` is now a functional download alias (P3-L6) |
| `legal_journal` TRUNCATE protection missing | **Fixed** — DB-level `BEFORE TRUNCATE` deny trigger added (P3-L4) |
| DB-level legal_journal hash-chain insert enforcement missing | **Fixed** — `BEFORE INSERT` trigger now recomputes and validates sequence/previous/current hash (P3-L5) |
| Register identifier mismatch (journal vs receipts) | **Fixed** — unified to establishment-scoped `CR-<establishment_id>` across journal/printing/archive (P3-L7) |
| Password reset/change API missing + no global revoke on password lifecycle events | **Fixed** — `/auth/password/forgot|reset|change` implemented with global token cutoff revoke and current-token revocation on change (P3-L9) |
| `logClosure` dead on manual route | **Fixed** for manual routes and auto scheduler (P3-L1), with scheduler fail-closed atomic follow-up in P3-L2 (`360/361`) |
| Integrity verifier silently skipped seq 128 / CORRECTION | **Fixed** (P0-L5) |
| Software events missing | **Fixed** with fail-safe critical-event journaling + retries (P3-L3) |
| Thermal receipt missing statutory legal mention | **Fixed** (P1-L6) |
| Archive PDF / ANNUAL / DAILY side-effect | **Fixed** (P1-L7, P1-L8) |
| Journal append not serializable / no retry | **Fixed** (P2-L9) |
| `resetJournalDevOnly` conflicts with immutability trigger | **Fixed** on `main` and now ported to `development` (P2-L10) with tenant scoping preserved via `SET LOCAL session_replication_role = 'replica'` |
| `business-day-stats` missing `access_compliance` | **Fixed** |
| `journal/stats` permission inconsistency (S8/S9) | **Fixed** |
| Swagger try-it-out in production | **Fixed** (P2-S11) |
| Setup/bootstrap password policy consistency | **Fixed** on setup + auth create paths (`/auth/register`, `/auth/users`) (P3-S2) |
| establishment_admin role grant via user-management permission | **Fixed** — only system admins can grant `establishment_admin` (P3-S3) |
| `orderAudit` POST actor from body | **Fixed** (now `req.user.id`) |
| `send-user-invitation` accessible to any authed user | **Fixed** (`canManageUsers` + establishment check) |
| Auth endpoint rate limits | **Fixed** (P2-S12 with Postgres-backed store in prod) |
| Production DB TLS verification default | **Fixed** (P3-S1; `sslRejectUnauthorized=true` by default in production) |
| Logger redaction of setup / client-error headers (S13/S14) | **Fixed** |
| `tenantContext` namespace clarity | **Fixed** (now under `rls/`, P2-Q5) |
| Empty `controllers/` directory | **Fixed** (removed in patch 244) |

---

## 5. Recommended sequencing

If the goal is **NF525-credible by end of Q3 2026**, do these in order:

1. **P3-L1 + P3-L2 + P3-Q1** (closure journal correctness — fastest fiscal wins, ~3 days).
2. **P3-S1 + P3-S2 + P3-S3** (security blockers — ~2 days).
3. **P3-L3** (software events fail-safe — required for Sécurisation).
4. **P3-L6 + P3-L4 + P3-L5** (archive HTTP surface + DB-level immutability — Inaltérabilité/Archivage).
5. **P3-L7** (unify register id — touches journal hash, receipts, and tests; do it once and cement it).
6. **P3-L9 + P3-S4 (P2-S16 phase 1)** (real identity story).
7. **P3-Q2/Q3/Q4/Q5/Q6/Q7** (architectural cleanup of fiscal modules + finish error sweep + real-DB integration tests).
8. Remaining P2-grade items as capacity allows.

When that sequence is done, the verdict for each NF525 pillar becomes "OK", and the remaining work is procedural (référentiel mapping, attestation, retention controls, scope decision).

---

## 6. Patch-note conventions for this round

- Each task gets a `PLAN.md` and an `IMPLEMENTATION.md` under `docs/patch-notes/` (next available index).
- Documentation-only changes do not get new patch notes (per recent user instruction).
- All work lands on `development`; merges to `main` go through the existing PR / merge flow.

---

*End of audit. The list above is the source of truth for the next remediation round.*
