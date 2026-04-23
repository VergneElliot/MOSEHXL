# MOSEHXL — Full Code & Architecture Audit (April 2026) — Part 3

Date: 2026-04-21  
Scope: `/home/zone01student/Projects/MOSEHXL` (repo-wide), focusing on `MuseBar/backend` and `MuseBar` frontend.  
Purpose: Preserve the audit and the full remediation plan “word for word” for traceability.

---

## 5. User / role / permissions audit

### 5.1 The root cause of your "admins are system admins" bug

Four independent issues stack up:

1. **Login hard-codes** `role = is_admin ? 'system_admin' : ...` (`authLogin.ts:54` and `:135` on refresh). The DB's `users.role` column is **ignored** when `is_admin = true`.
2. **Several write paths set `is_admin = true` for establishment admins**:
   - `services/setup/userAccountOperations.ts:51-110` — setup wizard sets `role = 'admin'` AND `is_admin = true` for the first establishment user.
   - `services/userInvitation/invitationAcceptance.ts:58-74` — establishment-invitation acceptance sets `role = 'establishment_admin'` AND `is_admin = true`.
   - Only the newer `services/establishmentAccountCreation/database/UserAccountOperations.ts:58-71` correctly sets `is_admin = false` for establishment admins.
3. **Middleware split** disagrees with login:
   - `requireAdmin` checks `req.user.is_admin` (system-admin gate).
   - `requireEstablishmentAdmin` checks `req.user.role === 'establishment_admin'`.
   - A user with `is_admin=true` **and** an establishment ends up with `role = 'system_admin'` in the JWT → passes `requireAdmin` (global!), fails `requireEstablishmentAdmin`. So they can access system-admin endpoints **and** are locked out of establishment-admin ones. Exactly the confusion you described.
4. **Role vocabulary is inconsistent across modules** — I counted these role strings in the codebase:
   - `'system_admin'`, `'establishment_admin'`, `'admin'` (setup wizard legacy), `'cashier'`, `'manager'`, `'establishment_manager'`, `'establishment_staff'`, `'supervisor'`, plus `DEFAULT_ROLES` (`admin`/`manager`/`staff`/`cashier`) in `routes/userManagement/roles/rolePermissions.ts`.
   - Different route files use different allow-lists.
   - The intended final vocabulary (per README): `system_admin`, `establishment_admin`, `cashier`. Everything else is legacy or dead.

### 5.2 Cross-tenant risk in user management

- **Live endpoint `GET /api/auth/users`** — tenant-safe (reads `req.user.establishment_id` from JWT, SQL filters by it).
- **`POST /api/user-management/send-user-invitation`** — only requires `requireAuth`, not `requireEstablishmentAdmin`. Allows any authenticated user whose `establishment_id` matches the body to send invitations. A `cashier` with a valid token can invite an `establishment_admin` (not `system_admin`, which is excluded by the allow-list). This is a **privilege escalation path**.
- **`routes/userManagement/teamRoutes.ts` + `roleRoutes.ts` + `users/userQueries.ts`** — contain IDOR patterns and cross-tenant listings but are **not mounted** in `app.ts`. Still a footgun if ever imported.

### 5.3 Granular permissions

- `user_permissions` table + names: `access_pos`, `access_menu`, `access_happy_hour`, `access_history`, `access_settings`, `access_compliance`.
- **Enforced on the frontend only** — `AppRouter` hides tabs. Backend never calls `requirePermission(...)` on any route.
- `access_happy_hour` has no matching tab in the frontend (dead permission).
- `requirePermission` middleware defined but never used = permissions system is cosmetic from the server's perspective.

### 5.4 `is_admin` vs `role` — recommended cleanup

`is_admin` is redundant with `role = 'system_admin'`. Drop it, or derive it strictly from role everywhere. Right now it's the overloaded flag that causes all the confusion.

---

## 6. Printing system audit (your recent pain point)

### What works

- `printDataRepo.ts:65-96` — receipt build query correctly filters `o.establishment_id = $2`. Good.
- `printingConfigRepo`, `printing_history`, `logPrintingHistory` — use `establishment_id`. Good.
- Epson `pollKey` is auto-generated with `randomUUID()` and tenant-scoped. Reasonable design.
- The orchestration split is intentional: `backend/src/printing/` (config + poll + repo) and `backend/src/services/printing/` (provider implementations + factory + types). Bridged by `printingServiceManager.ts`. Clean SoC, not duplication.

### Problems

| # | Severity | Issue |
|---|---|---|
| P1 | **HIGH** | `printing_configurations` / `printing_history` have **no CREATE TABLE in the migration chain**. Code expects them to exist. On a fresh DB bootstrapped via migrations alone, printing routes will crash. |
| P2 | MEDIUM | `printDataRepo.ts` reads `o.receipt_number` and `o.receipt_hash` from `orders`. These columns are not added by any migration in `migrations/files/`. Either dead columns you rely on, or latent schema drift (same DB-vs-code contract issue as P1). |
| P3 | MEDIUM | `PrinterSetup.tsx` uses raw `fetch` with manual `Authorization` header instead of `ApiService` — documented in the README as "by design" but it's the one remaining bypass of the centralized API layer. |
| P4 | MEDIUM | `routes/printingCompat.ts` mounted on `/` (root) to support legacy client paths (`POST /print-*` without `/api/printing` prefix). Still OK, but needs a deprecation plan. |
| P5 | LOW | Imports use deprecated `authenticateToken` alias from `middleware/auth.ts:117-118` instead of `requireAuth`. |

---

## 7. Code quality, hygiene, architecture drift

### 7.1 Dead / orphaned code

| What | Verdict |
|---|---|
| `printer-bridge/` — lockfile only, no `package.json`, no source | **Delete or complete** (strong smell of abandoned subproject) |
| `MuseBar/backend/src/controllers/` — empty directory | Delete |
| `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts` — not mounted but carry cross-tenant leak patterns | **Delete** (security footgun) |
| `services/CorsConfiguration.ts` — not used by `app.ts` | Delete or adopt |
| `BusinessSettingsModel` in `models/index.ts` — no tenant filter, no caller, but exported | **Delete** |
| Setup wizard `userAccountOperations.ts` (legacy, sets `is_admin=true`) vs `establishmentAccountCreation/database/UserAccountOperations.ts` (correct) | Pick one, retire the other |
| `services/userInvitationService.ts` — thin re-export of `services/userInvitation/` | OK today, but simplify |

### 7.2 Documentation drift (README vs reality)

| Claim | Reality |
|---|---|
| "PostgreSQL with schema-based multi-tenancy" | Column-based with dead per-tenant schemas |
| "Single definition per concept" | `Order`/`OrderItem` types are defined in at least 3 places (backend interfaces, frontend `src/types/orders.ts`, `LegalReceipt/types.ts`) |
| "No file over ~500 lines" | Close but not strictly true on some route files |
| "No debug auth routes" | `POST /api/auth/setup` is effectively that |
| "System admin has no access to detailed establishment DB" | Enforced only by frontend routing — `system_admin` JWT passes `requireAdmin` on all system routes; nothing prevents hitting `/api/orders?...` with a manually crafted `establishment_id` if the JWT had one |

### 7.3 Error handling consistency

- `AppError` hierarchy exists and `createErrorHandler` is wired, but **grep for `next(new AppError` in `routes/` returns zero matches**. Routes still use local `try/catch` + `res.status(...).json(...)`.
- **Silent `.catch(() => {})`** on audit logging throughout `authLogin.ts`, `authRegister.ts`, invitations. Audit failures are invisible, which is itself a compliance issue (pillar S).
- **Bare `catch {}`** blocks in `orderCRUD.ts`, `categories.ts`, `products.ts`, `adminDashboard.ts`. Error is neither logged nor propagated.

### 7.4 Type safety

- Backend: almost no `any`. Good.
- Frontend: many `any` usages in `src/services/api/orders.ts`, `PrintAfterSaleDialog.tsx`, `PrinterSetup.tsx`, invitation services, POS payment types. Tighten incrementally.
- Zero `@ts-ignore` / `@ts-nocheck`. Good.
- `JSON.parse` with silent swallowing in `printingConfigRepo.ts:15-20`, `happyHourSettings.ts:41`, `journalQueries.ts:13`, `QRReceiptService.ts:125` — can hide corrupt data.

### 7.5 Testing

- **Backend `package.json` has `"test": "echo 'Error: no test specified' && exit 1"`** while CI runs `npm test`. Pipeline literally fails on that step (or it's skipped elsewhere). No backend test at all.
- Frontend has `src/hooks/__tests__/usePOSState.test.ts`. That's it.
- **For a fiscal-compliance system, test coverage is a compliance concern**, not just an engineering one. An inspector will ask.

### 7.6 Logger consistency

- Structured logger used in many services (`printing.ts:319`). Good.
- Leftover `console.error` in `routes/legal/businessInfo.ts:17-20`. Fix.
- Migration CLI uses `console.*` with `eslint-disable no-console` — intentional, fine.

---

## 8. Priority action plan

I've ordered by impact and (where practical) sequenced dependencies. This is sized for a single-developer project; each numbered item is a self-contained branch/PR.

### Phase A — Critical security & legal (do before anything else; block the live SaaS)

**A1. Lock down `POST /api/auth/setup` immediately.**
- Option 1 (recommended): remove the route entirely once the prod admin exists; bootstrap via a one-off migration or CLI `npm run bootstrap:admin` that reads from env and refuses to run without a `BOOTSTRAP_TOKEN` env var.
- Option 2: require a `SETUP_SECRET` env var (32+ chars) matched against an `X-Setup-Secret` header.

**A2. Fix the role/`is_admin` collapse (the "admins are system admins" bug).**
1. Stop setting `is_admin = true` for establishment admins. Patch `services/setup/userAccountOperations.ts:51-110` and `services/userInvitation/invitationAcceptance.ts:58-74` to set `is_admin = false, role = 'establishment_admin'`.
2. Add a migration `fix_establishment_admin_is_admin.sql`:
   ```sql
   UPDATE users
   SET is_admin = false
   WHERE role = 'establishment_admin' OR role = 'admin' OR establishment_id IS NOT NULL;
   ```
   Only `role = 'system_admin'` should keep `is_admin = true`.
3. Invert the login logic in `authLogin.ts:54` and `:135`:
   ```typescript
   const role: string = d?.role || (is_admin ? 'system_admin' : 'establishment_admin');
   ```
   so the DB `role` is the source of truth and `is_admin` is only a fallback for a system_admin row with no role set.
4. Better: delete `is_admin` entirely over two releases. Derive `is_admin` from `role === 'system_admin'` everywhere. Single source of truth.
5. Normalize the role vocabulary to exactly three values: `system_admin`, `establishment_admin`, `cashier`. Add a migration that maps legacy values (`admin` → `establishment_admin`, `manager` → `cashier`, `establishment_manager`/`establishment_staff` → `cashier`). Update every allow-list.

**A3. Make the legal journal per-establishment.**
1. Add migration: `ALTER TABLE legal_journal ADD COLUMN establishment_id UUID REFERENCES establishments(id);`
2. Backfill: join `legal_journal.order_id → orders.establishment_id`.
3. Make `sequence_number` unique **per establishment** instead of globally: `DROP CONSTRAINT legal_journal_sequence_number_key; ALTER TABLE legal_journal ADD CONSTRAINT legal_journal_seq_per_est UNIQUE (establishment_id, sequence_number);`.
4. Rewrite `journalQueries.getNextSequenceNumber(establishmentId)`, `getLastEntry(establishmentId)`, `getEntriesForPeriod(start, end, establishmentId)`. Update all callers.
5. Same treatment for `audit_trail` and `archive_exports` (add `establishment_id`, backfill, filter).
6. Update `GET /api/legal/journal/entries`, `/verify`, `/journal/:orderId`, archive list/get to filter by `req.user.establishment_id`.
7. Keep the DB trigger that blocks UPDATE/DELETE.

**Planned/implemented in repo:** `docs/patch-notes/68-LEGAL-PER-ESTABLISHMENT-A3-PLAN.md` (objectives, checklist, risks) and `docs/patch-notes/69-LEGAL-PER-ESTABLISHMENT-A3-IMPLEMENTATION.md` (what shipped, file map, follow-ups).

After A3 the system is legally coherent for multiple tenants. This is the single most impactful fix for compliance.

**A4. Enforce backend permissions.**
- Apply `requirePermission('access_pos')` / `access_menu` / `access_history` / `access_settings` / `access_compliance` on the respective routers in `app.ts`. The middleware is already written, just never used.
- Remove `access_happy_hour` (dead) or actually wire it.

**A5. Harden the production host (outside the repo, but you asked):**
- `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`, `AllowUsers mosehxl` (or your service user), restart sshd.
- Firewall: `ufw default deny incoming`, allow 22 (from your IP only if possible), 80, 443. Block 3000/3001 from the public internet; expose them only via Nginx reverse proxy.
- The API should bind to `127.0.0.1`, not `0.0.0.0`, with Nginx terminating TLS and proxying. Change `app.ts:142` to `'127.0.0.1'` in production.
- Disable or scope `CORS_ORIGIN` to the exact production domain(s).
- Disable Swagger in production (wire the existing `swaggerEnabled` config flag).

### Phase B — High-impact architecture (do right after A)

**B1. Decide the multi-tenancy model and commit to it.**

You have two realistic options:
- **Option 1 (recommended — least disruption):** stay column-based. **Drop `schema_name` and `SchemaManager` entirely.** Update README to say "shared-table multi-tenancy with `establishment_id`" and delete dead per-tenant schemas with a migration. Low risk, fast, matches what the code already does.
- **Option 2 (more isolation, much more work):** move to real schema-per-tenant. Every model has to route queries through a per-tenant schema. The migration system has to know about a schema list. `SchemaManager.getSchemaNameForEstablishment` has to actually be used. Months of work; risky.

**Plan/implementation of record:** `docs/patch-notes/70-MULTI-TENANCY-B1-SHARED-TABLES-RLS-PLAN.md` and `docs/patch-notes/71-MULTI-TENANCY-B1-SHARED-TABLES-RLS-IMPLEMENTATION.md`.

My recommendation is **Option 1**. If you ever need stronger isolation for a high-value tenant, you can ship a separate deployment for them.

**B2. Close remaining tenant-leak holes.**
- `SubBillModel.create` — set `establishment_id` from the parent order explicitly.
- Delete `BusinessSettingsModel` in `models/index.ts`.
- Delete unmounted `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts` — they are a latent leak if ever mounted.
- Add `establishment_id` to `order_items` as a denormalized column (or at least enforce the parent's tenant in every INSERT). Defense in depth.

**Plan/implementation of record:** `docs/patch-notes/72-MULTI-TENANCY-B2-LEAK-CLOSURE-PLAN.md` and `docs/patch-notes/73-MULTI-TENANCY-B2-LEAK-CLOSURE-IMPLEMENTATION.md`.

**B3. Printing schema drift — put `printing_configurations` and `printing_history` into the migration chain.** Create a new migration that `CREATE TABLE IF NOT EXISTS` for both; confirm columns match the code (`printingConfigRepo.ts`, `logPrintingHistory`).

**Plan/implementation of record:** `docs/patch-notes/74-PRINTING-TABLES-MIGRATION-CHAIN-B3-PLAN.md` and `docs/patch-notes/75-PRINTING-TABLES-MIGRATION-CHAIN-B3-IMPLEMENTATION.md`.

**B4. Clarify `orders` columns.** Either migrate `receipt_number` / `receipt_hash` / `tax_amount` into the schema officially, or remove their usage in `printDataRepo.ts` and compute them on demand.

**Plan/implementation of record:** `docs/patch-notes/76-ORDERS-RECEIPT-COLUMNS-B4-PLAN.md` and `docs/patch-notes/77-ORDERS-RECEIPT-COLUMNS-B4-IMPLEMENTATION.md`.

### Phase C — Code hygiene (do in parallel with B)

**C1. Delete dead code:**
- `printer-bridge/` (the whole directory, unless you finish the bridge)
- `MuseBar/backend/src/controllers/` (empty dir)
- `services/CorsConfiguration.ts` (unused)
- `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts`
- `models/index.ts` `BusinessSettingsModel`
- `services/setup/userAccountOperations.ts` (once `establishmentAccountCreation` is the sole path)
- `services/userInvitationService.ts` barrel (import from the directory directly)

**Plan/implementation of record:** `docs/patch-notes/78-CODE-HYGIENE-C1-DEAD-CODE-PLAN.md`, `docs/patch-notes/79-CODE-HYGIENE-C1-DEAD-CODE-IMPLEMENTATION.md`, `docs/patch-notes/80-CODE-HYGIENE-C1-SETUP-USER-OPS-CUTOVER-PLAN.md`, and `docs/patch-notes/81-CODE-HYGIENE-C1-SETUP-USER-OPS-CUTOVER-IMPLEMENTATION.md`.

**C2. Consolidate error handling:**
- Convert every route `try/catch + res.status()` into `asyncHandler` + `next(new AppError(...))`. Easy pattern, big consistency win.
- Replace every `.catch(() => {})` on audit logging with `logger.error` + `AppError`. Silent audit failures are a pillar-S compliance defect.
- Replace `console.error` in `routes/legal/businessInfo.ts:17-20` with the logger.

**Plan/implementation of record:** `docs/patch-notes/82-CODE-HYGIENE-C2-ERROR-HANDLING-PLAN.md` and `docs/patch-notes/83-CODE-HYGIENE-C2-ERROR-HANDLING-IMPLEMENTATION.md`.

**C3. Type safety:**
- Fix frontend `any` in `src/services/api/orders.ts`, `PrintAfterSaleDialog`, `PrinterSetup`.
- Log `JSON.parse` failures in `printingConfigRepo`, `happyHourSettings`, `journalQueries`, `QRReceiptService`.

**C4. Documentation correction:**
- Rewrite the README claims: multi-tenancy is column-based; types have minor drift; file sizes; remove NF525 "Ready" for multi-tenant until A3 ships.
- Delete or merge outdated patch notes (60 is about a plan that's now superseded by this audit).

**C5. Testing — stop pretending.**
- Backend `package.json`: remove the stub `"test"` command or add a real Jest/Vitest setup. Minimum: one smoke test per route family + a hash-chain integrity test that proves the per-tenant chain works.
- CI: enable `npm audit` on backend (already enabled per workflow) and fail on high-severity findings.
- Add a test that writes 100 orders across 3 establishments and asserts `GET /api/orders` returns exactly the caller's establishment's orders.

### Phase D — Nice-to-haves (do when the above is done)

- JWT revocation via a `token_blocklist` table (or short-lived access + refresh tokens). Right now a compromised token lives for up to 7 days.
- Re-enable `requirePermission` on routes instead of allowing `is_admin` to bypass everything.
- Move Epson poll key out of the query string into a header.
- Adopt a monorepo root `package.json` with workspaces, or delete the root lockfile + `node_modules/`.
- Unify `Order`/`OrderItem` types in a shared package (`@mosehxl/types`) consumed by both backend and frontend.

---

## 9. "Is each establishment really isolated?" — definitive answer

**Partially.** For day-to-day POS operations (orders, products, categories, closures, business settings) **yes**, as long as JWTs carry the correct `establishment_id` and the `is_admin` flag is not abused. The SQL filters are consistently applied in the `OrderModel`, `ProductModel`, `CategoryModel`, etc.

**No for the legal / compliance surfaces** (journal, audit trail, archive). Those tables are global, and the endpoints that read them don't filter by tenant. This is the most critical fix.

**No for role semantics** — `is_admin` overloading makes establishment admins indistinguishable from system admins at login, which is exactly the bug you observed.

---

## 10. Recommended branch plan

```
security/a1-setup-route-hardening       → A1
fix/a2-role-is-admin-collapse            → A2 (biggest UX & security win, visible immediately)
legal/a3-per-establishment-journal       → A3 (most work, biggest compliance win)
security/a4-enforce-require-permission   → A4
ops/a5-host-hardening                    → out-of-repo (runbook / checklist)
arch/b1-drop-schema-name                 → B1
fix/b2-tenant-leak-closure               → B2
schema/b3-printing-tables-migration      → B3
cleanup/c1-dead-code                     → C1
chore/c2-error-handling-consolidation    → C2
```

Ship A1 and A2 this week. A3 is a one-shot deep migration with a tested backfill script; plan a weekend. Everything in phase C can be PRs of ≤200 LOC each.

