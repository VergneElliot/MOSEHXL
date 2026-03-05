# Patch 56 — Technical Audit: Clean Base and V2 Readiness

This patch documents the **technical audit** that made the codebase a clean, professional base for expansion and prepared V2 for deployment with V1 data. It covers new migrations, single-source-of-truth cleanups, API and type fixes, and documentation updates.

---

## 1. What is a "technical audit" and why do it?

A **technical audit** means going through the project with a checklist of good practices and fixing anything that doesn’t match:

- **Single source of truth** — Each concept (e.g. “how we get the current establishment”, “how we format dates”) should be defined in one place and reused everywhere. Duplicated logic is harder to maintain and easy to change in one place and forget in another.
- **Separation of concerns** — Routes, business logic, and formatting live in their own layers and files so the code stays readable and testable.
- **No dead code** — Unused files and commented-out code are removed so the codebase stays clear.
- **V2 readiness** — The database migration path from the old “V1” data to the new “V2” schema is complete and documented, so you can deploy V2 on the server and have it work with existing data.

This patch is the result of that audit: many small, targeted changes that together give you a **clean base to continue working and expanding**, feature by feature.

---

## 2. What was changed?

### 2.1 New database migrations (V1 → V2 compatibility)

**What’s a migration?**  
A migration is a small script that changes the database schema (add a column, create a table, etc.) in a controlled, repeatable way. We run them in order so every environment (dev, production) ends up with the same structure.

Four new migrations were added:

| Migration | Purpose |
|-----------|--------|
| `2026_02_26_02_30_00_add_closure_tips_change_weekly.sql` | Adds `tips_total` and `change_total` to `closure_bulletins` and allows the `WEEKLY` closure type. Without this, closure logic that uses these columns would fail at runtime. |
| `2026_02_26_03_00_00_add_users_is_active.sql` | Adds an `is_active` column to the `users` table. Team and user-management code already expected this column; without the migration, those queries would fail. |
| `2026_03_05_12_00_00_rate_limit_store.sql` | Creates the `rate_limit_store` table used for PostgreSQL-backed rate limiting (so limits survive server restarts and work across multiple processes). |
| `2026_03_05_13_00_00_v1_data_backfill.sql` | **V1 data backfill:** Creates a default establishment from existing business settings and sets `establishment_id` on all existing rows (categories, products, orders, users, etc.). Without this, old V1 data would have `NULL` establishment_id and would be invisible to V2, which filters everything by establishment. |

**Beginner takeaway:** Migrations are the single, ordered list of “how the database was upgraded.” The backfill migration is what lets you deploy V2 on the server and have it automatically attach existing V1 data to the right establishment.

---

### 2.2 Dedicated “change” endpoint and frontend fix

**Problem:** The “Faire de la Monnaie” (cash register change) flow was sending a request to create an order with `total_amount: 0` and `items: []`. The generic order-creation validation requires at least one item and positive amounts, so the request was rejected.

**Fix:**  
- **Backend:** A dedicated route was added: `POST /api/orders/payment/change` with body `{ amount, direction: 'card-to-cash' | 'cash-to-card' }`. This endpoint creates the zero-total “change” order and writes to the audit trail, without going through the normal order-creation validation.  
- **Frontend:** `usePOSAPI.processChange` was updated to call this new endpoint instead of `POST /api/orders`.

**Beginner takeaway:** When one flow (e.g. “record a change operation”) doesn’t fit the rules of a generic flow (e.g. “create a normal order”), we give it its own endpoint and validation instead of bending the generic one.

---

### 2.3 Frontend API base URL (single source for “where is the backend?”)

**Problem:** Some frontend code was calling `fetch('/api/...')`. That is a **relative** URL: the browser sends the request to the same host and port as the current page (e.g. the React app on port 3000). The backend, however, runs on a different port (e.g. 3001). So those requests never hit the API.

**Fix:**  
- **useCompliance.ts** (legal compliance dashboard): Replaced raw `fetch('/api/...')` with `ApiService.get(...)`. The API service uses a base URL that is detected or set at startup (see course docs on API config), so all calls go to the correct backend.  
- **useErrorHandler.ts** (error reporting): Replaced `fetch('/api/client-errors')` with `fetch(apiConfig.getEndpoint('/api/client-errors'))` so the error-reporting request also goes to the backend URL.

**Beginner takeaway:** “Single source of truth” for the backend URL means: one place (API config + API service) decides where the server is; every feature uses that (e.g. via `ApiService` or `apiConfig.getEndpoint()`), so we never send requests to the wrong place.

---

### 2.4 Dead code and empty file removal

- **Removed:** Unused hook `useLegalCompliance.ts` (the compliance dashboard uses `useCompliance` instead).  
- **Removed:** Unused top-level component `PasswordReset.tsx` (no route pointed to it; the auth folder still has `PasswordResetRequest` and `PasswordResetForm` for when you add the feature later).  
- **Removed:** Commented-out line `// const location = useLocation();` in `App.tsx`.  
- **Deleted:** Empty file `config/db.ts` in the backend (the app uses the pool created in `app.ts`; this file was leftover and had no imports).

**Beginner takeaway:** Dead code and empty files make the project harder to navigate and can confuse tools (e.g. “is this still used?”). Removing them keeps the codebase honest and easier to extend.

---

### 2.5 Structured logger in core route handlers

**What’s the “structured logger”?**  
Instead of `console.log` or `console.error`, we use a **Logger** that writes messages with a level (error, warn, info), a category (e.g. `LEGAL_JOURNAL`, `ORDER_PAYMENT`), and optional context. That makes it easier to filter and search logs in production.

**Change:** In the main order and legal route files (`orderCRUD`, `orderPayment`, `orderLegal`, `orderAudit`, `legal/journal`), any remaining `console.error` in catch blocks was replaced with `logger.error(...)` so all errors go through the same logging pipeline. (The exact way to call `logger.error` was fixed in Patch 57 so the TypeScript build passes.)

---

### 2.6 User ID type consistency (frontend)

**Problem:** In the frontend, `User.id` was typed as `string`, but the backend (PostgreSQL) and API actually use a numeric user ID. That mismatch can cause subtle bugs (e.g. comparisons or URL building).

**Fix:**  
- In `types/auth.ts`, `User.id` and `EstablishmentMember.id` were changed from `string` to `number`.  
- In `useUserActions.ts`, the raw API user type and the mapping to the frontend type were updated so `id` stays a number.  
- In `useUserState.ts` and `useUserActions.ts`, callback parameters like `userId` were updated from `string` to `number` where they represent the same ID.

**Beginner takeaway:** Types are there to match reality. If the server sends a number, the frontend should type it as a number so the compiler and tools can catch misuse.

---

### 2.7 Single source for “current establishment” (backend)

**Problem:** Several route files (categories, products, orderCRUD, orderPayment) each had their own copy of a small helper that reads `establishment_id` from the authenticated user and returns 403 if it’s missing. Duplicating that logic in four places is redundant and error-prone.

**Fix:**  
- The helper `getEstablishmentId(req, res)` was defined **once** in `middleware/auth.ts` (next to `requireAuth`, which already attaches the user to the request).  
- It is re-exported from `routes/auth.ts` so any route can do `import { getEstablishmentId, requireAuth } from '../auth'` (or `./auth` depending on folder).  
- The four route files now import and use this single function instead of defining their own.

**Beginner takeaway:** “Single source of truth” for behaviour means: one implementation, many callers. When the rule for “how we get establishment_id” changes, you change it in one place.

---

### 2.8 Single source for date formatting (frontend)

**Problem:** Several components (compliance overview, compliance reports, closure container, legal receipt utils, useCompliance) each had their own little “format this date for display” function. So date format and locale were repeated in many places.

**Fix:**  
- A new utility file `utils/formatDate.ts` was added with:  
  - `formatDate(date)` — date + time in fr-FR.  
  - `formatDateOnly(date)` — date only in fr-FR.  
- All the components that were defining their own formatter now import and use these. The legal receipt `utils` re-export `formatDate` from this shared module so existing imports still work.

**Beginner takeaway:** Same as with currency (see patch 35): one formatter in one file, used everywhere. When you want to change date format or locale, you change one file.

---

### 2.9 Documentation updates

- **README.md:**  
  - New section **“Code quality & cleanliness”** describing single source of truth, separation of concerns, and the two intentional exceptions (PrinterSetup and establishmentAccountApi).  
  - Compliance note updated to state that legal journal and audit trail are written on completed orders; certification readiness wording updated.  
- **DEVELOPMENT-STATE.md:**  
  - Updated to reflect that the “7 critical fixes” are resolved (or deferred as secondary UI work).  
  - Migration section lists the full migration chain including the new and backfill migrations and explains that the backfill runs automatically when you run `npm run migration:migrate`.  
- **Reference schemas:**  
  - `legal-schema.sql` and `multi-tenant-schema.sql` comments updated to match the current migration state (e.g. closure_bulletins columns, users.is_active).

---

## 3. Summary table

| Area | Before | After |
|------|--------|--------|
| Closure bulletins | Missing tips_total, change_total, WEEKLY in DB | Migration adds columns and type; code and DB aligned |
| Users | No is_active column | Migration adds it; team/auth code works |
| Rate limiting | Table might be missing | Migration creates rate_limit_store |
| V1 data on deploy | Orphan rows with NULL establishment_id | Backfill migration links everything to default establishment |
| “Faire de la Monnaie” | POST /orders with empty items → validation error | Dedicated POST /orders/payment/change |
| Compliance / error reporting | fetch('/api/...') → wrong host/port | ApiService / apiConfig.getEndpoint() → correct backend |
| Dead code | Unused hook, component, comment, empty file | Removed |
| Route error logging | console.error in some routes | logger.error in core order/legal routes |
| User ID type | string in frontend, number in API | number everywhere in frontend types |
| getEstablishmentId | Copy-pasted in 4 route files | Single function in middleware/auth, re-exported |
| formatDate | Duplicated in many components | Single utils/formatDate.ts |
| Docs | Outdated or missing “clean base” view | README + DEVELOPMENT-STATE + schema comments updated |

---

## 4. How to verify

- Run backend migrations on a copy of your DB and confirm the new tables/columns exist and the backfill sets `establishment_id` where it was NULL.  
- In the app, use “Faire de la Monnaie” and confirm it succeeds and appears in history.  
- Open the legal compliance dashboard and confirm data loads (no “wrong port” or network errors).  
- Search the codebase for `getEstablishmentId` and confirm it’s defined only in `middleware/auth.ts` and re-exported from `routes/auth.ts`.  
- Search for `formatDate` and confirm components import from `utils/formatDate.ts` (or from a file that re-exports it).

This patch establishes the **clean base** and **V2 readiness** so you can deploy and then improve features one by one.
