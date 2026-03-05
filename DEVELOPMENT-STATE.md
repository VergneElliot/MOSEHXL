# Development Branch — Current State

This document captures the state of the `development` branch as of March 2026.
It is the working reference for what is complete, what is broken, and what needs to be fixed before V2 can replace V1 in production.

> **Post-audit update (March 2026):** A comprehensive code audit identified 48 issues across security, architecture, performance, type safety, and code quality. **45 fixes have been applied** (patches 11–55, documented in [docs/patch-notes/](docs/patch-notes/)). The 7 critical functional fixes listed below remain the priority for V2 completion.

---

## What Is Complete

### Architecture
- Full TypeScript codebase, backend and frontend
- Modular backend routes: `orders/`, `legal/`, `userManagement/`, `establishmentAccountCreation/`
- Modular frontend components: every major section has its own Container, hooks (state/logic/API), and sub-components
- Custom hooks pattern: `usePOSState`, `usePOSLogic`, `usePOSAPI`, `useHistoryState`, `useHistoryAPI`, `useMenuState`, `useMenuAPI`, `useAuth`, `useHappyHour`, `useDataManagement`
- Two separate user interfaces: **System Admin** (SaaS management) and **Business** (POS) — detected by JWT role after login
- Structured logging system (`utils/logger/`)
- Security middleware stack: rate limiting, CORS, input sanitization, security headers (`middleware/security/`)
- Environment validation on startup (`config/environment.ts`)
- Unified error handling with AppError hierarchy (`middleware/errorHandler.ts`) — consolidated from three separate systems
- Migration CLI system (`src/migrations/cli.ts`, `npm run migration:*`) with correct filename generation
- PostgreSQL-backed rate limiting (shared across processes, survives restarts)
- No hardcoded secrets — all secrets from validated environment variables
- No debug console.logs — structured logging throughout

### POS
- Product grid with category filter and accent-normalized search
- Cart management: add, remove, update quantity
- Payment dialog: simple cash/card with change calculation and tips
- Payment dialog: split payment (equal split or by item) with mixed cash/card sub-bills
- Order creation via `POST /api/orders` (orders are saved to DB)

### Menu Management
- Full CRUD for categories and products
- Soft delete when items have order history (legal preservation), hard delete otherwise
- Archive / restore for both categories and products
- Cascade: archiving a category archives all its products

### History
- Order list with business-day statistics (CA, card/cash totals, top 3 products)
- Search by order ID or date
- Stats pulled from `GET /api/legal/business-day-stats`

### Settings
- Business info (name, address, SIRET, TVA) — reads/writes `business_settings`
- Closure schedule (daily closure time, auto-closure toggle, grace period)
- Printer setup UI (not fully wired to backend)
- Payment settings UI

### Legal
- Legal compliance dashboard (read-only — journal integrity, closure status)
- Closure bulletins: create daily/weekly/monthly/annual, view list
- `GET /api/legal/closure/today-status`, `monthly-latest`
- Journal integrity verification (`GET /api/legal/journal/verify`)
- Compliance report (`GET /api/legal/compliance/report`)

### Auth
- JWT login with `rememberMe` (12h or 7d tokens)
- Token refresh (`POST /api/auth/refresh`)
- localStorage persistence with auto-refresh interval
- Role detection post-login (`system_admin` vs business user)

### System Admin Interface
- Establishments CRUD (`/system/establishments`)
- System users CRUD (`/system/users`)
- Security logs view (`/system/security-logs`)
- System dashboard with quick stats

### Multi-Tenant / Setup Wizard
- Full `BusinessSetupWizard` component for onboarding new establishments
- Invitation flow: create → email → accept → account setup
- `EstablishmentAccountCreation` component for invitation-based signup
- `POST /api/setup/*` and `POST /api/establishment-account-creation/*` routes functional
- SendGrid email service with templates (invitation, verification, establishment created)

### Services
- Thermal printing service (`utils/thermalPrint/`) — modular with queue, formatters, templates
- Multi-method printing (`services/printing/`) — browser, network, PrintNode, StarCloudPRNT
- Digital/email/QR receipt services (`services/receipts/`)

---

## The 7 Critical Fixes

These are the minimum changes required to make V2 a functional, legally-compliant replacement for V1 in production. They are ordered by priority.

---

### Fix 1 — Wire legal journal on order creation

**File:** `MuseBar/backend/src/routes/orders/orderCRUD.ts`

**Problem:** `POST /api/orders` creates orders, items, and sub-bills but never writes a `SALE` entry to the legal journal. Every transaction is invisible to the compliance system. This is the most critical legal bug.

**Fix:** After successful order creation, call `LegalJournalModel.logTransaction()`:

```typescript
// After items and sub-bills are created, before res.json():
if (order.status === 'completed') {
  try {
    await LegalJournalModel.logTransaction(
      {
        id: order.id,
        total_amount: order.total_amount,
        total_tax: order.total_tax,
        payment_method: order.payment_method,
        items: createdItems,
        created_at: order.created_at
      },
      userId
    );
  } catch (journalError) {
    console.error('Legal journal error:', journalError);
    // Do NOT block the response — log and continue
  }
}
```

---

### Fix 2 — Fix retour/change validation failures

**Files:** `MuseBar/backend/src/middleware/validation.ts`, `MuseBar/backend/src/routes/orders/orderCRUD.ts`

**Problem:** `commonValidations.orderCreate` uses `isValidPrice` (requires `>= 0`) on `total_amount` and requires `items.length > 0`. Retour operations send negative totals. Change operations send empty items. Both fail with a 400 validation error.

**Fix option A (recommended):** Remove `total_amount` and `items` from `commonValidations.orderCreate` strict validation. The route handler already handles the business logic; the middleware validation should only block malformed data, not negative amounts which are valid for refunds.

**Fix option B:** Add a `transaction_type` field to the request body and branch the validation rules by type.

---

### Fix 3 — Route retour/change to the correct endpoints

**Files:** `MuseBar/src/hooks/usePOSAPI.ts`, `MuseBar/src/hooks/useHistoryAPI.ts`

**Problem:** Both `usePOSAPI.processRetour` and `useHistoryAPI.processReturn` POST directly to `POST /api/orders` (the generic CRUD endpoint, which does not write to the legal journal). The proper endpoints `POST /api/orders/payment/retour` and `POST /api/orders/payment/cancel-unified` exist, are authenticated, and write to the legal journal — but are never called from the frontend.

**Fix:** Update `usePOSAPI.processRetour` to call `POST /api/orders/payment/retour`. Update `useHistoryAPI.processReturn` to call `POST /api/orders/payment/cancel-unified`.

---

### Fix 4 — Remove hardcoded credentials and debug endpoints

**File:** `MuseBar/backend/src/routes/auth.ts`

**Problem:**
1. The `POST /login` handler has a hardcoded email/password bypass with `id: 3` hardcoded. This is a security risk and will break if the DB user changes.
2. `POST /api/auth/test-login` generates a token for a specific email with no password check.
3. `POST /api/auth/simple-login` is a duplicate of login with the same hardcoded bypass.
4. Dozens of `console.log` debug statements pollute production logs.

**Fix:** Remove the hardcoded bypass block, `test-login`, and `simple-login` routes entirely. Replace with the standard `UserModel.findByEmail` → `UserModel.verifyPassword` flow (which already exists in the fallback path). Remove all debug `console.log` calls.

---

### Fix 5 — Restore permissions query so tabs appear for non-admin users

**File:** `MuseBar/backend/src/routes/auth.ts`

**Problem:** `GET /api/auth/me` returns `permissions: []` always (`// TEMPORARY FIX: Skip permissions query to avoid hanging`). `AppRouter.tsx` filters tabs with `user?.permissions?.includes(permission)` — so a non-admin user with empty permissions sees no tabs at all and lands on a blank interface.

**Problem root cause:** The DB query for permissions was hanging. The hang was caused by the pool query wrapper that was added and later disabled. With the wrapper removed (already done — `pool.query` is now a clean pass-through in `app.ts`), the query should no longer hang.

**Fix:** In `GET /api/auth/me`, restore the permissions query:
```typescript
const permissions = await UserModel.getUserPermissions(userId);
```

Similarly in `requireAuth`, restore the DB lookup if role-based access control is needed for non-admin users. For now, using token data for the middleware is acceptable as long as `/me` returns the correct permissions.

---

### Fix 6 — Connect retour and change dialogs in POSContainer

**File:** `MuseBar/src/components/POS/POSContainer.tsx`

**Problem:** `usePOSState` contains full state for `retourDialogOpen`, `retourItem`, `retourReason`, `changeDialogOpen`, `changeAmount` etc., but `POSContainer.tsx` renders a stub comment `{/* Future: Add other dialog components (retour, change, etc.) */}` and never shows these dialogs.

**Fix:** Add a Retour dialog component (can reuse the pattern from `PaymentDialog`) and a Change dialog to `POSContainer.tsx`. Wire them to the state from `usePOSState`. The actual API calls in `usePOSAPI` already exist (pending Fix 3 for routing).

---

### Fix 7 — Connect return dialog in HistoryContainer and fix onDataUpdate after payment

**Files:** `MuseBar/src/components/History/HistoryContainer.tsx`, `MuseBar/src/components/POS/PaymentDialog/hooks/usePaymentProcessing.ts`

**Problem A:** `HistoryContainer.tsx` renders `{/* Future: Add Return Dialog Component */}`. `useHistoryState` has `openReturnDialog`/`closeReturnDialog` and `useHistoryAPI` has `processReturn` — but there is no UI component to trigger or display the return flow. Clicking "return" on an order in `OrdersTable` calls `onReturnOrder` which fires `actions.openReturnDialog(order)`, setting state for a dialog that doesn't exist in the JSX.

**Problem B:** In `usePaymentProcessing.ts`, `usePOSAPI` is instantiated with a no-op `onDataUpdate: () => {}`. After a successful payment, the product/order data is never refreshed, so the history and stats are stale until a manual reload.

**Fix A:** Create a `ReturnDialog` component for `HistoryContainer` with item selection (partial/full return), tip reversal toggle, and reason field.

**Fix B:** Pass the real `onDataUpdate` callback through from `PaymentDialogContainer` → `usePaymentLogic` → `usePaymentProcessing`.

---

## Known Non-Blocking Issues

These do not prevent the POS from working but should be addressed before a stable release.

| # | Issue | File | Notes |
|---|-------|------|-------|
| 9 | `orderAudit.ts` stubs return empty arrays | `routes/orders/orderAudit.ts` | GET audit trail endpoints return `{ audit_entries: [], note: 'to be implemented' }`. Wire to actual `audit_trail` table queries. |
| 10 | Audit trail not written on order creation | `routes/orders/orderCRUD.ts` | `POST /api/orders` does not call `AuditTrailModel.logAction`. V1 did. Add after the legal journal call in Fix 1. |
| 11 | CORS missing explicit `mosehxl.com` | `app.ts` | The `CORS_ORIGIN` env var covers it in production if set correctly, but it's not explicit in code. Add `'https://mosehxl.com'` and `'https://www.mosehxl.com'` to the whitelist. |
| 13 | `usePOSAPI.processChange` description mismatch | `hooks/usePOSAPI.ts` | Notes string says `Changement de caisse: ${amount}€` but the `Faire de la Monnaie` note was used in V1 to detect the operation type. Align with how the backend detects change operations. |
| 14 | Settings printer tab not connected | `components/Settings/Settings/PrinterSettings.tsx` | UI exists but is not wired to the new `services/printing/` backend services. |
| 15 | History dialogs for order details and receipts missing | `components/History/HistoryContainer.tsx` | `{/* Future: Add Order Details Dialog */}` and `{/* Future: Add Receipt Dialog Component */}`. View and print receipt flows exist in V1 but not yet ported. |

> **Resolved by audit patches (no longer blocking):**
> - ~~#8: `orderService.ts` dead code~~ → Removed (patch #32)
> - ~~#12: Debug logging in `useAuth.ts`~~ → Replaced with structured logger (patch #33)

---

## Database Migration Plan (V1 → V2)

The V2 schema is fully backward-compatible with V1 production data. All schema changes are additive.

### Steps to migrate production DB

```bash
# 1. Backup production first
pg_dump mosehxl_production > backup_pre_v2_$(date +%Y%m%d).sql

# 2. Apply V2 migrations
cd MuseBar/backend
NODE_ENV=production npm run migration:migrate

# 3. Create the MuseBar establishment record (one-time)
# INSERT INTO establishments (name, email, schema_name) 
# VALUES ('MuseBar', 'contact@musebar.fr', 'musebar');

# 4. Link existing users to the establishment
# UPDATE users SET establishment_id = '<uuid>' WHERE establishment_id IS NULL;
```

No existing data (orders, products, categories, legal journal) is modified or deleted.

---

## Development Setup

```bash
git checkout development
cd MuseBar/backend
cp .env.example .env   # fill in your values
npm install
npm run dev

# In another terminal
cd MuseBar
npm install
npm start
```

Required `.env` keys: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`, `JWT_SECRET` (32+ chars), `CORS_ORIGIN`.

Optional: `SENDGRID_API_KEY` for email features, `PORT` (default 3001).
