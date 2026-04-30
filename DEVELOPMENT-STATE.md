# Development Branch — Current State

This document captures the state of the `development` branch as of April 2026.
It is the working reference for what is complete, what is broken, and what needs to be fixed before V2 can replace V1 in production.

> **Post-audit update (April 2026):** The March 2026 remediation wave (45 fixes) was followed by additional hardening passes (P0/P1 stabilization and P2 cleanup/doc-truth sweeps). This file reflects the current post-remediation state of the `development` branch.

---

## What Is Complete

### Architecture
- Full TypeScript codebase, backend and frontend
- Modular backend routes: `orders/`, `legal/`, `userManagement/`, `establishmentAccountCreation/`
- Modular frontend components: every major section has its own Container, hooks (state/logic/API), and sub-components
- Custom hooks pattern: `usePOSState`, `usePOSLogic`, `usePOSAPI`, `useHistoryState`, `useHistoryAPI`, `useMenuState`, `useMenuAPI`, `useAuth`, `useHappyHour`, `useDataManagement`
- Two separate user interfaces: **System Admin** (SaaS management) and **Business** (POS) — detected by JWT role after login
- Structured logging system (`utils/logger/`) — all core route handlers use Logger, no `console.error` in POS routes
- Security middleware stack: rate limiting, CORS, input sanitization, security headers (`middleware/security/`)
- Environment validation on startup (`config/environment.ts`)
- Unified error handling with AppError hierarchy (`middleware/errorHandler.ts`) — consolidated from three separate systems
- Migration CLI system (`src/migrations/cli.ts`, `npm run migration:*`) with correct filename generation
- PostgreSQL-backed rate limiting (shared across processes, survives restarts)
- No hardcoded secrets — all secrets from validated environment variables
- No debug auth routes — no `test-login`, `simple-login`, or credential bypass
- Frontend API calls routed through `ApiService` with auto-detected backend URL

### POS
- Product grid with category filter and accent-normalized search
- Cart management: add, remove, update quantity
- Payment dialog: simple cash/card with change calculation and tips
- Payment dialog: split payment (equal split or by item) with mixed cash/card sub-bills
- Order creation via `POST /api/orders` with legal journal + audit trail write on completion
- Cash register change operation via `POST /api/orders/payment/change` (dedicated endpoint)

### Menu Management
- Full CRUD for categories and products
- Soft delete when items have order history (legal preservation), hard delete otherwise
- Archive / restore for both categories and products
- Cascade: archiving a category archives all its products

### History
- Order list with business-day statistics (CA, card/cash totals, top 3 products)
- Search by order ID or date
- Stats pulled from `GET /api/legal/business-day-stats`
- Return / annulation (full or partial) via `POST /api/orders/payment/cancel-unified` (legal journal REFUND, audit trail) — the only app path is **Historique** (`useHistoryAPI`).

### Settings
- Business info (name, address, SIRET, TVA) — reads/writes `business_settings`
- Closure schedule (daily closure time, auto-closure toggle, grace period)
- Printer setup UI (not fully wired to backend)
- Payment settings UI

### Legal
- Legal compliance dashboard with API calls routed through `ApiService`
- Closure bulletins: create daily/weekly/monthly/annual, view list
- `GET /api/legal/closure/today-status`, `monthly-latest`
- Journal integrity verification (`GET /api/legal/journal/verify`)
- Compliance report (`GET /api/legal/compliance/report`)
- Legal journal write on every completed order (SALE) and every refund/cancellation (REFUND)
- Audit trail write on every user action (order, login, permission change, etc.)

### Auth
- JWT login with `rememberMe` (12h or 7d tokens)
- Token refresh (`POST /api/auth/refresh`)
- `GET /api/auth/me` returns correct permissions from `user_permissions` table
- localStorage persistence with auto-refresh interval
- Role detection post-login (`system_admin` vs business user)
- Permission-based tab visibility (non-admin users see only permitted tabs)

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
- Multi-method printing (`services/printing/`) — browser, network, PrintNode, StarCloudPRNT
- Digital/email/QR receipt services (`services/receipts/`)

---

## Resolved / Decided Critical Fixes

The initial audit's 7 critical items have now been resolved or explicitly decided:

| # | Fix | Status | Details |
|---|-----|--------|---------|
| 1 | Wire legal journal on order creation | ✅ Done | `orderCRUD.ts` writes SALE + audit trail on `status === 'completed'` |
| 2 | Fix retour/change validation failures | ✅ Done | Dedicated `/orders/payment/change` endpoint bypasses `orderCreate` validation |
| 3 | Route retour/change to correct endpoints | ✅ Done | `useHistoryAPI` → `/orders/payment/cancel-unified`; `usePOSAPI` → `/orders/payment/change` (monnaie) — dedicated `/retour` route removed (unused) |
| 4 | Remove hardcoded credentials | ✅ Done | `auth.ts` is clean — no bypass, no debug routes |
| 5 | Restore permissions query | ✅ Done | `/me` endpoint fetches `UserModel.getUserPermissions(userId)` |
| 6 | POS “retour” dialog | ❌ Dropped | Was unused; return flow is **Historique** only. |
| 7 | UI dialog for return in History | ✅ Done | `ReturnDialog` + `cancel-unified` |

Return/annulation is fully implemented in Historique. POS `change` (faire de la monnaie) is wired; there is no separate POS retour.

---

## Known Non-Blocking Issues

These do not prevent the POS from working but should be addressed in a future release.

| # | Issue | File | Notes |
|---|-------|------|-------|
| 11 | CORS missing explicit `mosehxl.com` | `app.ts` | The `CORS_ORIGIN` env var covers it in production if set correctly, but it's not explicit in code. |
| 14 | Settings printer tab not connected | `components/Settings/PrinterSettings.tsx` | UI exists but is not wired to the new `services/printing/` backend services. |
| 15 | History dialogs for order details and receipts missing | `components/History/HistoryContainer.tsx` | View and print receipt flows exist in V1 but not yet ported. |

> **Previously known issues, now resolved:**
> - ~~#8: `orderService.ts` dead code~~ → Removed (patch #32)
> - ~~#9: `orderAudit.ts` GET stubs return empty arrays~~ → Wired to real `audit_trail` reads via `AuditTrailModel.getOrderAuditEntries` (Non-Blocking #9 implementation)
> - ~~#10: Audit trail not written on order creation~~ → Now written in `orderCRUD.ts`
> - ~~#12: Debug logging in `useAuth.ts`~~ → Replaced with structured logger (patch #33)
> - ~~#13: `usePOSAPI.processChange` notes mismatch~~ → Fixed with dedicated `/orders/payment/change` endpoint

---

## Database Migration Plan (V1 → V2)

The V2 schema is fully backward-compatible with V1 production data. All schema changes are additive. A V1 data backfill migration is included.

### Migration chain (12 files, lexicographic order)

```
2025_09_12_07_30_00_remove_email_unique_constraints.sql
2025_09_15_00_00_00_add_establishment_fields.sql
2026_02_25_00_00_00_add_pos_columns_and_establishment_isolation.sql
2026_02_25_00_15_00_create_setup_progress_tables.sql
2026_02_25_00_30_00_create_status_transitions_table.sql
2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql
2026_02_26_01_00_00_accounting_decimal_precision.sql
2026_02_26_02_00_00_add_establishment_id_to_closure_bulletins.sql
2026_02_26_02_30_00_add_closure_tips_change_weekly.sql
2026_02_26_03_00_00_add_users_is_active.sql
2026_03_05_12_00_00_rate_limit_store.sql
2026_03_05_13_00_00_v1_data_backfill.sql       ← auto-creates establishment, links all V1 data
```

### Steps to migrate production DB

```bash
# 1. Backup production first
pg_dump mosehxl_production > backup_pre_v2_$(date +%Y%m%d).sql

# 2. Apply V2 migrations (includes automatic V1 data backfill)
cd MuseBar/backend
NODE_ENV=production npm run migration:migrate
```

The backfill migration (`v1_data_backfill.sql`) automatically:
1. Creates a default "MuseBar" establishment from `business_settings` (or a fallback)
2. Sets `establishment_id` on all existing categories, products, orders, sub-bills, closure bulletins
3. Links all existing users to the establishment

No manual SQL is needed. No existing data is modified or deleted.

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
