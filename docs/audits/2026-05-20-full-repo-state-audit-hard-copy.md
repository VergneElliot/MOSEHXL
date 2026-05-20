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
| **P3-L1** | Auto-closure must append `CLOSURE` to the legal journal | `closureScheduler.ts` L139-162 creates the bulletin and writes an audit trail entry but **never calls `logClosure`** — so the legal journal stream has gaps for any day closed by the scheduler instead of by a human. Fiscal inspector-blocking. | **S** |
| **P3-L2** | Make closure bulletin + journal atomic (no swallow) | `routes/legal/closure.ts:47-71` (`appendClosureJournalEntry`) logs and continues on journal failure, so a `closure_bulletin` row can exist with no matching `CLOSURE` legal_journal row. Move into one transaction or fail the request. | **M** |
| **P3-L3** | Software events: fail-safe (or mandatory retry queue) for critical types | `logSoftwareEventBestEffort` swallows all errors. Boot/shutdown/time-change/admin-promotion losing their journal entry silently is a Sécurisation gap. | **M** |
| **P3-S1** | Production DB TLS: default `rejectUnauthorized: true` | `environment.ts` L192-206 + `app.ts` L84: prod `ssl: true` but `sslRejectUnauthorized` defaults **false** unless `DB_SSL_REJECT_UNAUTHORIZED=true`. Means production DB connections can MITM through any cert. Flip default; keep opt-in `sslAllowSelfSigned` for dev only. | **S** |
| **P3-S2** | Enforce `validatePassword` on every password-setting path | `POST /api/auth/users` (`authRegister.ts` L194-211), `POST /api/auth/register` (L44-61), direct `UserModel.createUserForEstablishment` bypass the shared policy applied in setup/invitations under P2-S4. | **S** |
| **P3-S3** | Restrict `establishment_admin` role grant to actual admins | `PUT /users/:id/role` lets anyone with `access_user_management` set `establishment_admin` (`authRegister.ts` L283-297). Separation-of-duties bug; one compromised user-manager owns the tenant. | **M** |

### P1 — Must-fix before customer-facing certification claim or external SOC2-style review

| ID | Title | Rationale | Effort |
|----|-------|-----------|--------|
| **P3-L4** | Block UPDATE/DELETE *and* TRUNCATE on `legal_journal` | Current trigger is row-level only (`BEFORE UPDATE OR DELETE FOR EACH ROW`). Add `BEFORE TRUNCATE` deny trigger; document `pg_dump`/restore policy. | **M** |
| **P3-L5** | DB-level hash chain enforcement on INSERT | Today only the app computes `previous_hash` / `current_hash`. Add a `BEFORE INSERT` trigger (or constrained `append_journal_entry` function) that recomputes hash from the prior row and rejects mismatches. Belt-and-braces against direct INSERTs. | **M** |
| **P3-L6** | Expose archive verify + download HTTP routes; drop or implement `POST .../export` (currently 501) | `archiveService.verifyArchiveExport` / `downloadArchiveExport` already exist as service methods — they have no HTTP surface. Inspectors need a way to verify/download a signed export. | **S** |
| **P3-L7** | Unify register identifier across journal and receipts | Journal hash payload uses `MUSEBAR-REG-001` (global, `journalSigning.ts` L11) but printed ticket uses `CR-{establishment_id}` (`printDataRepo.ts` L143). Must be per-establishment/per-register, and printed identifier must match the hashed one. | **M** |
| **P3-L8** | Reconcile closure bulletin totals against journal `SALE` sums | Today bulletin totals come from `orders`; if `legal_journal` diverges (e.g. failed append), the bulletin still says everything's fine. Add cross-check + flag discrepancies. | **M** |
| **P3-L9** | Implement password reset + change API + global session revoke on password change | `authPassword.ts` is empty; UI promises an email flow; `password_reset_requests` table is in schema with no API. Required for any production identity story. | **M** |
| **P3-S4** | Implement P2-S16 token long-term hardening — Phase 1 | See dedicated section §3. Short-lived access tokens, opaque refresh, httpOnly cookies or BFF. | **L** |
| **P3-Q1** | Stop the closure-journal swallow (`closure.ts:65-71`) | Same as P3-L2 but specifically in the route catch block: rethrow or fail-closed. | **S** |
| **P3-Q2** | Delete or mount `userManagement/roles/*` (~800+ LOC unmounted) | `RoleRoutes`, `RoleController`, `roleOperations`, `roleMutations`, `rolePermissionOperations` are exported but never mounted in `userManagement/index.ts`. This is dead surface that looks live in code review. Decision: delete or wire. | **M** |
| **P3-Q3** | Extract `orderCancel` god handler (~380 LOC) into a service | `routes/orders/orderCancel.ts:41-427` is one handler. Fiscal critical path; needs staged tests. Mirror P2-Q11 pattern. | **L** |
| **P3-Q4** | Split `journalQueries.ts` (~608 LOC) by concern | `journalAppend.ts`, `journalRead.ts`, `journalDevReset.ts`, `journalStats.ts`. Largest fiscal hotspot. | **M** |
| **P3-Q5** | Finish the `db/pool.ts` decoupling | Currently a 7-line re-export of `app.ts`'s pool, and ~22 models/services still `import { pool } from '../app'`. Migrate them all and make `db/pool.ts` the actual owner. | **M** |
| **P3-Q6** | Wrap `userManagement/invitationRoutes.ts` and `establishmentAccountCreation/index.ts` in `asyncHandler` | Live routes still using manual `try/catch/next` + raw `res.status(...).json({ error })`. Last gap from the P2-Q13 sweep. | **S** |
| **P3-Q7** | Add a real-DB Vitest project for compliance assertions | Today the immutability trigger and RLS deny-cross-tenant are only proven by SQL string assertions / mocks. Run actual Postgres in CI and verify trigger blocks `UPDATE` and that `SELECT` from a tenant context cannot see another tenant's rows. | **L** |

### P2 — Hardening / code quality (improves grade, not certification-blocking)

| ID | Title | Rationale | Effort |
|----|-------|-----------|--------|
| **P3-S5** | Move tokens from `localStorage` to httpOnly cookie or BFF (part of P2-S16) | Reduces XSS blast radius even before opaque-refresh migration. | **L** |
| **P3-S6** | Account lockout after N failed logins + admin unlock | Today only rate limit; no progressive lock; no audit `ACCOUNT_LOCKED`. | **M** |
| **P3-S7** | Optional HIBP k-anonymity check on set-password paths | Cheap to integrate; widely expected control. | **S** |
| **P3-S8** | 2FA (TOTP) for `system_admin` and `establishment_admin` | Step-up auth for admin paths. | **L** |
| **P3-S9** | Drop Epson poll `?key=` query fallback (`epsonPollHandler.ts` L48-51) | Query params leak in logs/referrers. Header-only. | **S** |
| **P3-S10** | `requirePermission(P.access_pos)` (or `access_compliance`) on `GET /api/orders/audit/:orderId` | Currently `requireAuth` only. | **S** |
| **P3-S11** | Default `ESTABLISHMENT_ADMIN_PERMISSION_MODE=explicit_only` in production | Reduces blast radius of a compromised tenant admin. | **S** |
| **P3-S12** | `timingSafeEqual` for prod client-error key compare (`app.ts` L212-214) | Same posture as `requireSetupSecret`. | **S** |
| **P3-S13** | Audit `establishment_id IS NULL` (`system_admin`) paths against RLS policies | Risk: super-admin path bypasses tenant wrapper; integration tests should prove RLS still blocks where intended. | **M** |
| **P3-S14** | Extend log redaction to `refresh_token`, `invitation_token` field names | Sensible after the P2-S13/S14 sweep. | **S** |
| **P3-S15** | Frontend client-side logger that ships to `/api/client-errors` (currently dev-only) | Replaces ~25 raw `console.error` sites in production frontend. | **M** |
| **P3-Q8** | Pass 3 of unified error sweep: ad-hoc 4xx branches → `ValidationError`/`NotFoundError`/`AuthenticationError`/`AuthorizationError` | ~200+ `res.status(4xx).json(...)` hits across auth, legal, invitations, products, printing, setup. P2-Q13 only finished the 500 sweep. | **L** |
| **P3-Q9** | Add migration checksum (SHA-256 of UP) + verify on apply | Editing an already-applied migration is silent today. | **M** |
| **P3-Q10** | Consolidate currency formatting through `formatCurrency` (or backend shared helper) | `LegalReceipt/utils.ts` and `BasePrintingService.ts` still have inline `toFixed(2) €`. | **S** |
| **P3-Q11** | Remove `services/SetupService.ts` shim and `services/setup/setupWizard.ts` legacy entry | Plus `services/email/EmailTemplateManager.ts` (wrapper) vs `services/email/templates/EmailTemplateManager.ts` (real). Pick one. | **S** |
| **P3-Q12** | Expand `@mosehxl/types` and ban `any` in new frontend code | Only 4 production import sites today; FE has ~50 `any` and ships parallel DTOs in `src/types/`. | **L** |
| **P3-Q13** | Toggle `noUncheckedIndexedAccess: true` in both tsconfigs | Highest-value strict flag still off; catches `req.query[x]` / array access bugs. Start in frontend, then backend. | **M** |
| **P3-Q14** | Remove `routes/authPassword.ts` empty placeholder once P3-L9 lands in the right place | Avoid the "empty file mounted" signal. | **S** |
| **P3-Q15** | Drop dual error stacks: pick `middleware/errorHandler.ts` and retire `utils/errors/standardErrorHandler.ts` if unused | Two parallel error systems exist; the standard one is the canonical HTTP handler. | **S** |
| **P3-Q16** | Introduce `react-i18next` (or similar) with `fr`/`en` namespaces | Today UI strings are inline and mixed FR/EN; currency/date hardcode `fr-FR`. | **L** |
| **P3-Q17** | Document `legal-schema.sql` vs `migrations/files/` drift policy | `legal-schema.sql` bootstrap `INSERT` omits `establishment_id`; reference SQL files can drift from the migration chain. Pick one as canonical and add a CI check. | **S** |
| **P3-Q18** | Backend coverage upload to Codecov | Today only frontend coverage is uploaded; backend `vitest` runs but coverage isn't shipped. | **S** |
| **P3-D1** | Update `README.md` "Code Quality" claims to match reality | README still implies "single pool in `app.ts`" and "no monoliths"; both are partially true. | **S** |
| **P3-D2** | Add a "current truth" doc that auto-references the latest patch-notes index | `docs/patch-notes/` is ~256 files now; finding "current truth" needs scanning latest numbers or `DEVELOPMENT-STATE.md`. A generated index would help. | **M** |

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

**Current state to be honest about:** D1 blocklist, P1-S1 refresh serialization, P1-S2 prior-session kick, P2-S3 role authority, P2-S17 `rememberMe`, P2-S18 Swagger interceptor are all in place — but the underlying token shape is unchanged. Treat P2-S16 as an **active roadmap**, not closed.

---

## 4. What is already fixed since the April 29 audit (so we don't re-do it)

This list is for posterity — verified during this audit, do not re-open.

| April 29 finding | Current state |
|------------------|---------------|
| Refund/change journal fail-safe | **Fixed** (`orderCancel.ts:327-378`, `orderChange.ts:62-83`) |
| Archive export endpoint lying about success | **Fixed** — now an honest `501` until P3-L6 lands; create path is real |
| `logClosure` dead on manual route | **Fixed** for manual routes; **still a gap on the auto scheduler (P3-L1)** |
| Integrity verifier silently skipped seq 128 / CORRECTION | **Fixed** (P0-L5) |
| Software events missing | **Wired** (P0-L3.1–L3.6), but **best-effort (P3-L3)** |
| Thermal receipt missing statutory legal mention | **Fixed** (P1-L6) |
| Archive PDF / ANNUAL / DAILY side-effect | **Fixed** (P1-L7, P1-L8) |
| Journal append not serializable / no retry | **Fixed** (P2-L9) |
| `resetJournalDevOnly` conflicts with immutability trigger | **Fixed** on `main` and now ported to `development` (P2-L10) with tenant scoping preserved via `SET LOCAL session_replication_role = 'replica'` |
| `business-day-stats` missing `access_compliance` | **Fixed** |
| `journal/stats` permission inconsistency (S8/S9) | **Fixed** |
| Swagger try-it-out in production | **Fixed** (P2-S11) |
| Setup bootstrap password policy (S4) | **Fixed** — but still **missing on other create paths (P3-S2)** |
| `orderAudit` POST actor from body | **Fixed** (now `req.user.id`) |
| `send-user-invitation` accessible to any authed user | **Fixed** (`canManageUsers` + establishment check) |
| Auth endpoint rate limits | **Fixed** (P2-S12 with Postgres-backed store in prod) |
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
