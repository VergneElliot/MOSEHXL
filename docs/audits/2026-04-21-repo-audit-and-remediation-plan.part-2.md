# MOSEHXL — Full Code & Architecture Audit (April 2026) — Part 2

Date: 2026-04-21  
Scope: `/home/zone01student/Projects/MOSEHXL` (repo-wide), focusing on `MuseBar/backend` and `MuseBar` frontend.  
Purpose: Preserve the audit and the full remediation plan “word for word” for traceability.

---

## 3. Security audit

### 3.1 The SSH issue

I read all four scripts in `scripts/` and the single GitHub Actions workflow. **There is no SSH config, no `sshd_config`, no user creation, no firewall setup, and no cloud provisioning anywhere in the repo.** The scripts are on-site installation scripts (they call `createdb`, `npm install`, `npm run build`, `serve -s build`), not cloud deployment scripts. The CI workflow builds artifacts but does not push them to any server.

**Conclusion:** `ssh root@<IP>` with no auth is a **server-side sshd/firewall misconfiguration**, not a code bug. It must be fixed at the host level (see action plan §6).

### 3.2 In-code security findings (most important)

| # | Severity | File / Location | Issue |
|---|---|---|---|
| S1 | **CRITICAL** | `routes/authRegister.ts:261-281` | `POST /api/auth/setup` has **zero** middleware. On an empty DB (or any DB where no `is_admin` user exists) the first HTTP caller becomes system admin. Reachable from the public internet. |
| S2 | **HIGH** | `app.ts:27-41` | CORS allow-list includes every private LAN range on port 3000 + arbitrary `CORS_ORIGIN` env values. Combined with `credentials: true`. Fine for a LAN-only install; for a cloud-exposed API, a misconfigured `CORS_ORIGIN` allows attacker origins. |
| S3 | **HIGH** | `app.ts:142` | `app.listen(port, '0.0.0.0')` — binds to every interface. If the cloud server has no firewall, the DB + API are reachable from anywhere. |
| S4 | **HIGH** | `middleware/auth.ts:91-100` (`requirePermission`) | Defined, exported — but **not applied to a single route**. Backend authorization is effectively "is_admin bypasses everything, role gates a few routes, permissions are only enforced on the frontend". A malicious client can call any endpoint allowed by `requireAuth + requireEstablishmentAdmin`, regardless of UI-granted permissions. |
| S5 | **HIGH** | `authLogin.ts:54` and `authLogin.ts:135` | `role = is_admin ? 'system_admin' : (d?.role || 'establishment_admin')` — **any** user with `is_admin=true` gets a system-admin JWT at login and refresh. This is the root of the "admins show up as system admins" bug. |
| S6 | MEDIUM | `app.ts:110` | Swagger (`/api/docs`) is always mounted, including in production; config has `swaggerEnabled` but it's not applied. |
| S7 | MEDIUM | `app.ts:116-130` (`POST /api/client-errors`) | No auth. Accepts arbitrary JSON and writes it to the server log. Free log flooding + potential log-injection vector. |
| S8 | MEDIUM | `routes/establishmentAccountCreation/index.ts:53` (and similar) | Logs 8-char token previews. Combined with the public `GET /validate/:token` endpoints (enumeration), reduces token secrecy. |
| S9 | MEDIUM | `routes/printing.ts:30-36` + `printing/epsonPollHandler.ts:32-36` | Epson poll uses a `pollKey` bearer in the **query string**. Query strings land in access logs, browser history, and proxy logs. Poll key = tenant-scoped secret. |
| S10 | MEDIUM | JWT model | Tokens are valid until expiry with no revocation list. A stolen token remains usable for 12h / 7d; `users.is_active=false` doesn't invalidate a live token. |
| S11 | LOW | `utils/database/transactionOperations.ts` | Savepoint names are interpolated into SQL. Internal-only today, but fragile if ever fed user input. |
| S12 | LOW | `CorsConfiguration.ts` (unused) | The canonical CORS module exists but `app.ts` uses `cors()` directly. Dead code + drift risk. |
| S13 | LOW | `routes/userManagement/roleRoutes.ts`, `teamRoutes.ts`, `users/userQueries.ts` | Entire routers with cross-tenant leak patterns (`user.is_admin` bypasses `establishment_id` check) — **not mounted today**. Dead code that is loaded but never wired. Ticking time bomb. |

### 3.3 What's actually solid

- JWT secret is env-only, ≥32 chars, validated on startup (`middleware/auth.ts:11-17`).
- `bcrypt` for password storage.
- Invitation tokens use `crypto.randomBytes(32)` (128 bits), expiry enforced, status=`pending`.
- Schema names validated with a strict regex before any SQL interpolation (`models/establishment.ts:57`).
- Rate limiting is PostgreSQL-backed and keyed on user/IP.
- Security headers, XSS/nosniff/frame-deny are set (CSP allows `'unsafe-inline'` scripts — tolerable for an SPA, not ideal).
- Parameterized queries are used consistently for user data.

---

## 4. Database architecture & multi-tenancy audit

### 4.1 The headline: multi-tenancy is **shared-table with `establishment_id`**, not schema-based

- `establishments.schema_name` exists and `SchemaManager.createEstablishmentSchema` creates tables inside an `establishment_<uuid>` schema on registration (`services/SchemaManager.ts:25-36`).
- **But** the only way those tenant schemas are used is the creation step itself. `getSchemaNameForEstablishment` is defined on `EstablishmentModel` and **never called anywhere else**. All runtime POS I/O hits `public.orders`, `public.products`, etc. with `WHERE establishment_id = $n`.
- The README saying "PostgreSQL with schema-based multi-tenancy" is **wrong**. `docs/course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md` is accurate.

### 4.2 Tenant isolation matrix

| Table | Has `establishment_id`? | App queries filter by it? | Verdict |
|---|---|---|---|
| `categories` | ✅ | ✅ | OK |
| `products` | ✅ | ✅ | OK |
| `orders` | ✅ | ✅ (every CRUD method in `orderModel.ts`) | **OK** — contrary to first suspicion, orders **are** filtered; see §4.3 below for why it looks broken |
| `order_items` | ❌ (scoped via JOIN on `order_id`) | ✅ on reads (JOIN), ❌ on writes (trusts `order_id`) | Write path assumes caller passes a same-tenant `order_id` — safe in normal flow, but no defense in depth |
| `sub_bills` | ✅ (column exists post-migration) | ✅ reads via JOIN; ❌ **INSERT does not set `establishment_id`** (`orderModel.ts` SubBillModel.create) | **Should fix** — write drops the column |
| `business_settings` | ✅ | ✅ via `BusinessInfoModel` | OK |
| `business_settings` (legacy) | ✅ | ❌ — `models/index.ts` `BusinessSettingsModel.get()` does `ORDER BY id DESC LIMIT 1`, `WHERE id = 1` | **Dead but dangerous** — if any code path ever re-imports this, cross-tenant leak |
| `users` | ✅ | ✅ | OK for listings (filters by `establishment_id`); see §5 for role coherence issues |
| `legal_journal` | ❌ | ❌ | **Fails pillar I in SaaS** |
| `audit_trail` | ❌ | ❌ | Global table |
| `closure_bulletins` | ✅ | ✅ | **OK** (patches 17 + 2026_02_26_02 + 2026_03_19 backfill) |
| `archive_exports` | ❌ | ❌ (`SELECT * FROM archive_exports`) | Global |
| `printing_configurations` / `printing_history` | ✅ | ✅ | OK, but **no `CREATE TABLE` appears in the migration chain** — schema drift risk (see §4.5) |

### 4.3 "Orders are not isolated" — what's really happening

I verified the code paths and **every order CRUD method in `OrderModel` filters on `establishment_id`**. Likely causes of the symptom you saw:

1. **JWT semantics**: if a user has `is_admin = true`, their JWT says `role = 'system_admin'`. In the frontend, `system_admin` routes to the System Admin UI, not the POS — so they don't see any establishment POS. But if code paths ever treat them as also having an `establishment_id`, they could see cross-tenant data. Check `d?.establishment_id` in `authLogin.ts:55` — for users with **both** `is_admin=true` **and** an establishment set (which happens today via the invitation and setup-wizard paths), `establishment_id` **is** populated in the JWT.
2. **Legal endpoints** (journal entries, verify, orderLegal, archive, audit_trail) are **not** tenant-filtered. If you see "other establishments' orders" through those surfaces, that's exactly why.
3. **Row `establishment_id` being NULL or wrong** — the V1 backfill migration (`2026_03_05_13_00_00_v1_data_backfill.sql`) assigns a single default establishment to unlinked rows. Any row created before that and not captured by the backfill would still be NULL and invisible (not "leaking", just missing).

### 4.4 `getEstablishmentId` helper

`middleware/auth.ts:108-114` — reads `req.user.establishment_id` **from the JWT**, never re-queries the DB. That means:

- If an admin changes a user's `establishment_id` in the DB, the old token still asserts the old tenant until expiry (up to 7 days with rememberMe). No revocation.
- The helper is functionally correct but trust-on-first-decode.

### 4.5 Schema / migration hygiene

- 20 migrations in `migrations/files/`, all with `-- UP` / `-- DOWN`. Manager enforces the split. Good.
- Reference schemas in `models/*.sql` are "doc-only" and out of sync with migrations — this is known and documented (patch #49).
- `SchemaManager` creates a different `legal_journal` definition inside tenant schemas (no hash chain, simpler columns) than `public.legal_journal`. Two definitions for one concept — the tenant one is dead.
- `printing_configurations` / `printing_history` tables appear to be created **outside** the migration chain — they're queried but I found no `CREATE TABLE` for them in `migrations/files/`. Either there's an orphan `models/*.sql` that gets run manually, or the tables were hand-created on the server. Schema drift. **Must fix.**

