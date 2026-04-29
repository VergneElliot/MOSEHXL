# MOSEHXL — Code Audit & Full Developer Course

**Purpose:** Deep audit of the MOSEHXL MuseBar codebase, architecture assessment, and a complete course for beginner developers to understand every part of the project.

**Last updated:** April 2026 (historical audit snapshot + post-remediation corrections)

---

## Part I — Audit Report

A comprehensive audit was performed on the codebase in February/March 2026. This audit identified 48 issues across security, architecture, performance, type safety, and code quality. **All 45 actionable fixes have been applied.** Each fix is documented in the [patch notes](../patch-notes/) folder.

### Summary of What Was Found and Fixed

#### Security Issues (11 fixes)
- Hardcoded JWT, database, and archive secrets → removed, app fails fast if missing
- Invitation tokens exposed in API responses → stripped from responses
- .env files tracked in git → untracked and gitignored
- SQL injection via schema name interpolation → whitelist validation
- SQL keyword stripping that corrupted data → removed (parameterized queries are the real defense)
- Unauthenticated endpoints (email-test, admin-dashboard) → auth middleware added
- Debug info leaked on login → removed
- Case-sensitive auth directory → unified to lowercase
- Math.random for request IDs → crypto.randomUUID()
- X-Powered-By header → removed
- Establishment account API bypassing auth → routed through central HTTP client

#### Architecture & Dead Code (14 fixes)
- Dual error handling systems → consolidated into one (AppError hierarchy + unified handler)
- Dual database pools → single pool in app.ts
- (Legacy) Divergent schema creation paths → unified SchemaManager (the project later commits to shared-table multi-tenancy in Phase B1)
- Five overlapping setup/invitation flows → documented and consolidated
- Multiple password validation rules → single shared utility
- Duplicate standalone and shim files → removed (both backend and frontend)
- Dead code: Mongoose handling, fake PDF generator, unused localStorage methods → removed
- Debug console.logs everywhere → structured logger (backend), removed (frontend)
- Self-HTTP proxy in printing compat → direct in-process calls
- Circular logger import cycle → broken by removing re-export
- Per-request service instantiation → module-level singletons

#### Performance Issues (4 fixes)
- N+1 query in setUserPermissions (2N+1 round-trips) → single INSERT...SELECT in a transaction
- In-memory rate limiting (single process, resets on restart) → PostgreSQL-backed shared store
- Infinite React re-render loops (unstable useEffect deps) → memoized API hook returns
- useAuth 100ms sleep hack → proper apiConfig.isReady() gate

#### Type Safety & Deduplication (6 fixes)
- 11 duplicated currency formatters → single formatCurrency utility
- Duplicated snackbar pattern in 3 hooks → shared useSnackbar hook
- 3+ divergent ClosureBulletin type definitions → single unified type
- Stale @types/react-router-dom (v5 types with v6 library) → removed
- `any` types in critical code → proper TypeScript types
- Empty catch blocks swallowing errors → errors now logged

#### Database & Migration Fixes (5 fixes)
- Migration chain broken on fresh DB → setup tables added to chain
- Package lockfile not committed → committed for reproducible builds
- Reference schema SQL files diverged from actual DB → aligned
- Orphan migration SQL files outside chain → moved into chain
- Migration CLI generating wrong filename format → fixed

#### Legal & Multi-Tenancy (5 fixes)
- Closure bulletins not scoped per-establishment → establishment_id added
- Printing/product queries ignoring establishment schema → fixed
- Product isActive hardcoded to true → uses real DB value
- Double API call on component mount → single useEffect
- Timezone strategy inconsistent → single DEFAULT_APP_TIMEZONE constant

---

### Architecture Assessment (Post-Audit)

#### Strengths ✅

| Aspect | Status | Notes |
|--------|--------|-------|
| **Layered architecture** | ✅ | Routes → Middleware → Services → Models → DB. Clear separation. |
| **Modular routes** | ✅ | `orders/`, `legal/`, `userManagement/` split into focused sub-routers. |
| **Single source of truth** | ✅ | User types in `models/user.ts` (backend) and `types/auth.ts` (frontend). |
| **Custom hooks pattern** | ✅ | usePOSState/Logic/API — separation of state, computation, and API calls. |
| **Multi-tenant scoping** | ✅ | `establishment_id` on categories, products, orders. Routes extract from `req.user`. |
| **Legal compliance structure** | ✅ | ISCA pillars: legal_journal, closure_bulletins, audit_trail, archive_exports. |
| **Environment validation** | ✅ | `config/environment.ts` validates on startup. No hardcoded secrets. |
| **Migration system** | ✅ | CLI for migrations, version tracking, correct filename generation. |
| **Unified error handling** | ✅ | Single AppError hierarchy with proper status codes and global handler. |
| **Structured logging** | ✅ | Category loggers, request logging, no debug console.logs in production. |
| **Security middleware** | ✅ | PostgreSQL-backed rate limiting, CORS, sanitization, security headers. |

#### Historical note on "7 critical fixes"

At the time of the March 2026 audit snapshot, 7 functional fixes were tracked as release blockers.  
Those items are now resolved/decided in current `development` branch state (see `DEVELOPMENT-STATE.md` and patch notes `98+` for subsequent stabilization waves).

#### Enterprise Best Practices Checklist

| Practice | Status |
|----------|--------|
| Environment-based config (no secrets in code) | ✅ |
| Structured logging (no console.log in prod) | ✅ |
| Input validation middleware | ✅ |
| Rate limiting (shared across processes) | ✅ |
| CORS configuration | ✅ |
| Parameterized SQL (no injection) | ✅ |
| JWT with expiry and proper secret management | ✅ |
| Password hashing (bcrypt, cost factor 12) | ✅ |
| Error boundaries (frontend) | ✅ |
| Migration-based schema changes | ✅ |
| API documentation (Swagger) | ✅ |
| Health check endpoint | ✅ |
| CI/CD pipeline (lint, test, security scan) | ✅ |
| Security headers (CSP, HSTS, no fingerprinting) | ✅ |

---

## Part II — Full Course: Every File Explained

This section walks you through the project so you can explain every part to someone else.

---

### A. Project Root & Top-Level Structure

```
MOSEHXL/
├── MuseBar/           # The main application (frontend + backend)
├── docs/              # Documentation
│   ├── course/        # Learning guide (this file and chapters 01-10)
│   └── patch-notes/   # 45 fix documents from the audit
├── scripts/           # Deployment and setup scripts
├── backups/           # Database backups (gitignored)
├── .github/workflows/ # CI/CD pipeline
├── README.md          # Project overview, quick start, legal compliance summary
└── DEVELOPMENT-STATE.md  # Current state, resolved/decided critical fixes, known issues
```

**Why this structure?** `MuseBar` is the product name. Backend and frontend live inside it because they're deployed together. `docs/` keeps all learning material in one place, split into `course/` (teaching) and `patch-notes/` (change log).

---

### B. Backend Structure (`MuseBar/backend/`)

#### B.1 Entry Point: `src/app.ts`

**What it does:** Creates the Express app, configures middleware, mounts all routes, starts the server.

**Key sections:**
1. **Environment** — `initializeEnvironment()` loads and validates `.env` (fails fast if any required variable is missing)
2. **Database pool** — `pool` from `pg` with `options: '--timezone=Europe/Paris'` so SQL `NOW()` returns Paris time
3. **Middleware order** — CORS → express.json() → request logger → security (rate limit with PostgreSQL store, sanitization, headers)
4. **Routes** — All `/api/*` routes mounted here (16+ route groups)
5. **Error handling** — `notFound` middleware then the unified `createErrorHandler` from `errorHandler.ts`
6. **Closure scheduler** — Started in production only (daily closures at 02:00 Paris time)

**Why `pool` is exported:** Routes and models need DB access. Exporting from `app.ts` avoids circular imports (config is loaded here first, before anything else).

---

#### B.2 Config: `src/config/`

| File | Purpose |
|------|---------|
| `environment.ts` | Reads `process.env`, validates required vars (DB_*, JWT_SECRET, etc.), returns typed `EnvironmentConfig`. Fails fast on startup if invalid. No hardcoded fallback secrets. |
| `timezone.ts` | Exports `DEFAULT_APP_TIMEZONE = 'Europe/Paris'`. Used everywhere for business-day calculations and closure timing. |

---

#### B.3 Middleware: `src/middleware/`

| File | Purpose |
|------|---------|
| `auth.ts` | **Canonical auth middleware.** `requireAuth` (JWT verify), `requireAdmin`, `requireEstablishmentAdmin`, `requirePermission`, `generateToken`, `verifyToken`. Fails at load time if JWT_SECRET is missing or too short. |
| `validation.ts` | `validateBody`, `validateParams`, `commonValidations`, `paramValidations`. Reusable rules for request validation. French error messages. |
| `errorHandler.ts` | **Unified error system.** `AppError` (base), `ValidationError` (400), `AuthenticationError` (401), `AuthorizationError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429), `BusinessLogicError` (422), `DatabaseError` (500). Also: `asyncHandler` (wraps async route handlers), `createErrorHandler` (global error middleware), `notFound` (404 fallback). Normalizes PostgreSQL error codes, JWT errors, and network errors into proper API responses. |
| `security/` | Rate limiting (PostgreSQL-backed via adapter pattern), input sanitization (XSS only — no SQL keyword stripping), security headers (CSP, HSTS, X-Frame-Options). Composed in `SecurityMiddlewareFactory.create()`. CORS policy is configured in `app.ts`. |

---

#### B.4 Routes: `src/routes/`

Routes are the "doors" the frontend knocks on. Each route file maps URLs to handler functions.

| Route File | Mount Path | Purpose |
|------------|------------|---------|
| `auth.ts` | `/api/auth` | Login, logout, register, /me, refresh, /users (establishment-scoped CRUD), permissions |
| `categories.ts` | `/api/categories` | Category CRUD, scoped by establishment |
| `products.ts` | `/api/products` | Product CRUD, scoped by establishment |
| `orders/index.ts` | `/api/orders` | Combines orderCRUD, orderPayment, orderLegal, orderAudit |
| `legal/index.ts` | `/api/legal` | Journal, closure, compliance, archive |
| `userManagement/` | `/api/user-management` | User invitations |
| `enhancedEstablishments.ts` | `/api/enhanced-establishments` | Creation workflow, stats, search |
| `establishmentSearch.ts` | `/api/establishment-search` | Establishment search and filtering |
| `setup.ts` | `/api/setup` | Business setup wizard |
| `establishmentAccountCreation/` | `/api/establishment-account-creation` | Invitation acceptance flow |
| `printing.ts` | `/api/printing` | Receipt printing |
| `printingCompat.ts` | `/` (root) | Backward-compatible thermal printer endpoints (direct in-process calls, no self-HTTP proxy) |
| `docs.ts` | `/api/docs` | Swagger/OpenAPI |
| `adminDashboard.ts` | `/api/admin` | Admin dashboard (requires authentication) |
| `emailTest.ts` | `/api/email-test` | Email testing (development only) |

**Orders sub-routes:**
- `orderCRUD.ts` — GET/POST/PUT/DELETE for orders (main order creation lives here)
- `orderPayment.ts` — Retour, cancel-unified (refunds/cancellations with legal journal writes)
- `orderLegal.ts` — Legal journal endpoints for orders
- `orderAudit.ts` — Audit trail endpoints (stub — returns placeholder data pending wiring)

---

#### B.5 Models: `src/models/`

Models wrap SQL in TypeScript. One model per table (roughly).

| Model | Table(s) | Purpose |
|-------|----------|---------|
| `user.ts` | users, user_permissions | UserRow, AuthenticatedUser, findByEmail, verifyPassword, getUserPermissions (batch INSERT...SELECT), setUserPermissions (transactional) |
| `database/orderModel.ts` | orders, order_items, sub_bills | OrderModel, OrderItemModel, SubBillModel — all scoped by establishment_id with whitelisted update fields |
| `database/productModel.ts` | categories, products | CategoryModel, ProductModel — soft/hard delete, archive/restore, establishment-scoped |
| `index.ts` | model re-exports | Barrel for active DB models used by routes/services |
| `establishment.ts` | establishments | EstablishmentModel — CRUD and lifecycle operations in shared-table multi-tenant runtime |
| `auditTrail.ts` | audit_trail | AuditTrailModel.logAction (who, what, when, where) |
| `legalJournal/` | legal_journal, closure_bulletins | Legal journal operations (hash chain), closure creation (daily/weekly/monthly/annual, per-establishment), integrity verification |
| `archiveService.ts` | archive_exports | Archive export creation (CSV/XML/JSON), HMAC-SHA256 signing, integrity verification |

**Interfaces:** `models/interfaces/index.ts` defines shared types (Category, Product, Order, etc.) used by models and routes.

---

#### B.6 Services: `src/services/`

Business logic that doesn't fit in a single route or model.

| Service | Purpose |
|---------|---------|
| `email/` | SendGrid/Nodemailer integration, email templates (invitation, verification, password reset, etc.), EmailLogger |
| `setup/` | Setup wizard steps, validation, database seeding, default data (categories, products, payment methods) |
| `establishment/` | Establishment creation orchestrator, validation, search, status transitions, dashboard data |
| `establishmentAccountCreation/` | Invitation acceptance flow: validate token, create user account, create establishment-linked records |
| `userInvitation/` | Invitation creation, email, acceptance, validation |
| `printing/` | Multi-method printing via adapter pattern: browser, network, PrintNode, StarCloudPRNT, composite |
| `receipts/` | Digital, email, QR receipt generation |
| `SetupService.ts` | Legacy setup service (delegates to setup/ subfolder) |

---

#### B.7 Utils: `src/utils/`

| File/Folder | Purpose |
|-------------|---------|
| `logger/` | Structured logging system with category loggers, request logger middleware, performance monitoring. Replaced all debug console.logs. No circular import issues (re-export cycle was fixed). |
| `closureScheduler.ts` | Cron-like job: automatic daily closure at configurable time (default 02:00 Paris). Checks every minute. Production only. |
| `database/sharedQueries.ts` | Reusable SQL for users, establishments, invitations |
| `errors/` | Standard error handler utilities |
| `errorRecovery.ts` | Error recovery system initialization |
| `passwordValidation.ts` | Single password validation rule set (5 criteria: length, lowercase, uppercase, number, special char) shared by all flows |

---

#### B.8 Migrations: `src/migrations/`

- `cli.ts` — Migration CLI (`npm run migration:migrate`, `rollback`, `status`, `create`)
- `migration-manager.ts` — Applies migrations, tracks version in `migrations` table
- `files/` — SQL migration files with `YYYY_MM_DD_HH_MM_SS_name.sql` format, each with `-- UP` and `-- DOWN` sections

Current migrations in the chain:
1. Remove email unique constraints
2. Add POS columns and establishment isolation
3. Create setup progress tables
4. Create status transitions table
5. Convert timestamps to TIMESTAMPTZ
6. Accounting decimal precision (DECIMAL 12,4)
7. Add establishment_id to closure_bulletins
8. Create rate_limit_store table

---

### C. Frontend Structure (`MuseBar/src/`)

#### C.1 Entry Points

| File | Purpose |
|------|---------|
| `index.tsx` | React entry — renders `<App />` into `#root` with MUI ThemeProvider and BrowserRouter |
| `App.tsx` | Root component — routing (setup wizard, establishment account creation, main app), auth detection, happy hour state, data loading. System admins get a separate `SystemAdminRouter`; business users get `AppHeader` + `AppRouter` |

---

#### C.2 Components: `src/components/`

Each major feature has a Container component + sub-components + dedicated hooks.

| Component | Purpose |
|-----------|---------|
| `POS/` | Point of sale — ProductGrid, CategoryFilter, OrderSummary, PaymentDialog (with split payment, tip support) |
| `Menu/` | Category and product management — CategorySection, ProductSection, create/edit dialogs |
| `History/` | Order history — StatsCards, SearchBar, OrdersTable (with return processing) |
| `Settings/` | Tabbed settings — General, Business Info, Payment, Printer, Closure |
| `Legal/` | Legal compliance dashboard (ISCA status), legal receipt display |
| `Closure/` | Closure bulletin management — create, view, filter by type |
| `HappyHour/` | Happy hour control — form, schedule, status, product selection |
| `auth/` | Login form, account setup, invitation validation, password reset |
| `Admin/` | User management (with permissions editor), audit trail, establishment management |
| `SystemAdmin/` | System admin UI — dashboard, establishments CRUD, system users CRUD, security logs |
| `Setup/` | Business setup wizard (invitation validation → personal info → business info → confirmation) |
| `EstablishmentAccountCreation/` | Invitation-based signup flow for new establishments |
| `PrinterSetup/` | Printer configuration UI |
| `common/` | Shared: AppRouter (tab navigation by permission), SystemAdminRouter, ErrorBoundary (with retry + French error messages), loaders, dialogs, data table |

**AppRouter** — Tab visibility: `establishment_admin` sees all tabs; cashiers see only tabs matching their permissions from `user.permissions`.

---

#### C.3 Hooks: `src/hooks/`

Custom hooks separate state, logic, and API calls — this is the core architectural pattern.

| Hook | Purpose |
|------|---------|
| `usePOSState.ts` | Cart, dialogs, payment method, retour/change state |
| `usePOSLogic.ts` | Filtered products (accent-normalized search), totals (TTC), tax computation, "can pay?" validation |
| `usePOSAPI.ts` | createOrder, processRetour, processChange |
| `useHistoryState.ts` | Order list, search, return dialog state (partial/full return, item selection) |
| `useHistoryAPI.ts` | loadOrders, loadStats (business-day), processReturn (cancel-unified). Memoized return to prevent re-render loops. |
| `useHistoryLogic.ts` | Order filtering, date formatting, payment method labels |
| `useMenuState.ts` | Categories, products, dialog state, form data |
| `useMenuAPI.ts` | CRUD for categories and products. Memoized return. |
| `useClosureState.ts` | Bulletins, today status, settings, monthly stats, filter/form state |
| `useClosureAPI.ts` | Load bulletins/status/settings, create closure, update settings. Memoized return. |
| `useAuth.ts` | Login, logout, token management, permissions, auto-refresh (gates on apiConfig.isReady(), no sleep hack) |
| `useHappyHour.ts` | Happy hour active state, polls every 60 seconds |
| `useDataManagement.ts` | Load categories + products from DataService on mount |
| `useSnackbar.ts` | Shared snackbar pattern: showSuccess, showError, closeSnackbar |
| `useLegalCompliance.ts` | Compliance status, journal entries, closure bulletins |
| `useEstablishments.ts` | System admin — load and manage establishments |

**Framework hooks** (in subdirectories):
- `dataFetching/` — Caching, retry, stale-while-revalidate, pagination, infinite scroll
- `formValidation/` — Field validation engine, error manager, debounced validation
- `loadingState/` — Loading/error state management, retry logic

---

#### C.4 Services: `src/services/`

| File | Purpose |
|------|---------|
| `api/core.ts` | Central HTTP client — fetch wrapper, auth token attachment, 15s timeout, 401 auto-logout. Uses crypto for request IDs. |
| `api/categories.ts`, `products.ts`, `orders.ts`, `legal.ts` | Domain-specific API helpers with snake_case↔camelCase mapping |
| `apiService.ts` | Facade wrapping all API modules with typed get/post/put/delete |
| `dataService.ts` | In-memory caching layer for categories and products |
| `happyHourService.ts` | Happy hour time calculation (localStorage-based, cross-midnight support) |
| `establishmentService.ts` | System admin — CRUD for establishments with search/filter |
| `establishmentAccountApi.ts` | Account creation API (uses centralized request() for auth and timeout) |
| `setupService.ts` | Setup wizard API (validate invitation, complete setup) |
| `authHelper.ts` | Avoids circular deps — registers setToken function, reads from localStorage |

---

#### C.5 Types: `src/types/`

| File | Purpose |
|------|---------|
| `auth.ts` | User, EstablishmentMember, ALL_PERMISSIONS (6 French-labeled permissions) |
| `business.ts` | Category, Product (with happy hour discount types), HappyHourSettings |
| `orders.ts` | Order, OrderItem (TTC pricing, exact tax amounts), SubBill, PaymentMethod |
| `api.ts` | Generic ApiResponse, Establishment, ClosureBulletin (single unified type), BusinessInfo |
| `system.ts` | SystemUser, SystemEstablishment, SystemSecurityLog |
| `setup.ts` | InvitationValidation, SetupFormData, SetupStep |
| `ui.ts` | TabConfig, LoadingState, FormState, ModalState, SnackbarState, table/form types |

---

#### C.6 Utils: `src/utils/`

| File | Purpose |
|------|---------|
| `formatCurrency.ts` | Single `Intl.NumberFormat('fr-FR', { currency: 'EUR' })` formatter — replaces 11 duplicated formatters |
| `businessInfoMapper.ts` | Maps snake_case backend business info to camelCase frontend |
| `performance/` | Browser performance monitoring (PerformanceObserver, API timing, memory usage) |
| `testing/` | Test utilities (mock generators, mock services, render utils) |

---

### D. Data Flow: Click to Database

**Example: User clicks "Pay" for a 15€ card payment**

1. **PaymentDialog** → `handleSimplePayment()` in usePaymentProcessing
2. **usePaymentProcessing** → assembles order payload (TTC prices, exact tax amounts)
3. **usePOSAPI.createOrder** → `apiService.post('/orders', payload)`
4. **apiService** → `fetch('http://localhost:3001/api/orders', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: 'Bearer ...' } })`
5. **Express** → matches `POST /api/orders` to orderCRUDRouter
6. **Middleware** → CORS check → JSON parsing → request logging → security (rate limit, sanitization) → requireAuth (JWT verify)
7. **orderCRUD handler** → `OrderModel.create()`, `OrderItemModel.create()`, `SubBillModel.create()` (if split)
8. **Models** → `pool.query('INSERT INTO orders ... RETURNING *')`
9. **Response** → `res.status(201).json({ ...order, items, sub_bills })`
10. **Frontend** → `onOrderComplete()` clears cart, shows success snackbar (via useSnackbar)

**Current state:** after order creation, legal/audit write paths are now implemented and hardened (including compliance fail-safe behavior for completed orders in recent remediation passes).

---

### E. Current Improvement Priorities

The original 7-fix blocker list is no longer the active priority set.  
Current priority follows post-audit stabilization sequencing (P0/P1/P2), especially:

1. legal-chain and permission hardening follow-through,
2. continued dead/legacy code quarantine,
3. expanded integration tests for fiscal-critical and tenant-isolation paths.

See:
- `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`
- `docs/patch-notes/98-*` onward for the remediation chain.

---

## Part III — Quick Reference: File → Purpose

| Path | One-line purpose |
|------|------------------|
| `app.ts` | Express app, middleware, routes, DB pool, server start |
| `config/environment.ts` | Load and validate .env (no hardcoded secrets) |
| `config/timezone.ts` | DEFAULT_APP_TIMEZONE = 'Europe/Paris' |
| `middleware/auth.ts` | JWT verify, requireAuth, requireAdmin, requirePermission |
| `middleware/validation.ts` | validateBody, validateParams, commonValidations |
| `middleware/errorHandler.ts` | Unified AppError hierarchy, asyncHandler, global error handler |
| `middleware/security/` | Rate limiting (PostgreSQL), CORS, sanitization, headers |
| `routes/auth.ts` | Login, register, /me, /users, permissions |
| `routes/orders/orderCRUD.ts` | Order CRUD — **main order creation** |
| `routes/orders/orderPayment.ts` | Retour, cancel-unified (with legal journal writes) |
| `routes/legal/` | Journal, closure, compliance, archive endpoints |
| `models/user.ts` | UserRow, getUserPermissions (batch query) |
| `models/database/` | OrderModel, ProductModel, CategoryModel (establishment-scoped) |
| `models/legalJournal/` | Hash chain, closure bulletins, integrity verification |
| `utils/closureScheduler.ts` | Daily closure at configurable time (Paris timezone) |
| `utils/logger/` | Structured logging (no console.log) |
| `utils/passwordValidation.ts` | Single password rule set (shared everywhere) |
| `src/App.tsx` | Root routing, auth detection, interface switching |
| `src/components/common/AppRouter.tsx` | Tab visibility by role/permission |
| `src/hooks/useAuth.ts` | Token, user, login, logout (no sleep hack) |
| `src/hooks/usePOSAPI.ts` | createOrder, processRetour |
| `src/services/api/core.ts` | Central HTTP client, auth token, 401 handling |
| `src/types/auth.ts` | User, ALL_PERMISSIONS — frontend SSOT |
| `src/utils/formatCurrency.ts` | Single Euro formatter (replaces 11 duplicates) |

---

## Summary

- **Audit:** 48 issues were identified in the March 2026 snapshot; remediation continued beyond that baseline in subsequent patch waves.
- **Architecture:** Enterprise-grade patterns with ongoing stabilization; use current audit/patch notes for live status instead of this section's historical snapshot language.
- **Course:** This document + chapters 01–07 explain every major file, concept, and data flow. Use the patch notes for detailed change history.

For current stabilization status and migration context, see **[DEVELOPMENT-STATE.md](../../DEVELOPMENT-STATE.md)** and the latest patch notes.
