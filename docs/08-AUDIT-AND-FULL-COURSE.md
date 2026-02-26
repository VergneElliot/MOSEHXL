# MOSEHXL — Code Audit & Full Developer Course

**Purpose:** Deep audit of the MOSEHXL MuseBar codebase, architecture assessment, and a complete course for beginner developers to understand every part of the project.

**Last updated:** February 2026

---

## Part I — Audit Report

### 1. Redundant or Useless Code

#### 1.1 Dead Code (Never Used)

| File | Issue | Recommendation |
|------|-------|----------------|
| `backend/src/controllers/orderController.ts` | **Never imported or used.** The app mounts `ordersRouter` from `routes/orders/index.ts`, which uses `orderCRUD.ts` directly. OrderController was likely created for a controller pattern that was never adopted. | **Delete** `orderController.ts` — it duplicates logic already in `orderCRUD.ts`. |
| `backend/src/services/orderService.ts` | **Only used by OrderController**, which is dead. `orderCRUD.ts` calls models directly. OrderService has validation logic and legal journal stubs that could be useful, but they're never executed. | **Option A:** Delete both OrderService and OrderController. **Option B:** Refactor `orderCRUD.ts` to use OrderService and wire legal journal + audit trail there (aligns with Fix 1 in DEVELOPMENT-STATE.md). |
| `backend/src/routes/userManagement/userRoutes.ts` | **Not mounted.** userManagement/index.ts only mounts `invitationRoutes`. User CRUD is handled by `/api/auth/users` in auth.ts. | **Keep for reference** or delete if you're sure you won't need the legacy structure. Same for `teamRoutes.ts` and `roleRoutes.ts` — they exist but are not mounted. |
| `backend/src/routes/userManagement/teamRoutes.ts` | Same as above — dismounted. | Same. |
| `backend/src/routes/userManagement/roles/*` (RoleValidator, RoleAuditLogger, roleOperations, etc.) | Role routes are not mounted in userManagement. Permissions are handled via `/api/auth/users` and `/api/auth/permissions`. | These may be used by invitation flow or other modules — verify before deleting. |

#### 1.2 Unused Imports

| File | Issue |
|------|-------|
| `backend/src/app.ts` line 125 | `createErrorHandler` is imported but never used. The app uses `createEnhancedErrorHandler` from errorHandling.ts. | Remove the unused import. |

#### 1.3 Debug Code to Remove Before Production

| File | Issue |
|------|-------|
| `src/hooks/useAuth.ts` | Multiple `console.log('🔍 useAuth: ...')` statements (lines 30, 35-36, 39-40, 44, 46). DEVELOPMENT-STATE.md Fix #12 explicitly calls these out. | Remove all debug `console.log` in useAuth. |
| Various files | ~20+ files have `console.log` or `console.error`. Some are intentional (error handling); others are debug leftovers. | Audit each: keep `console.error` in catch blocks where no logger exists; remove debug `console.log`. |

---

### 2. Large Files & Refactoring Candidates

The session summary noted that some larger files were "purposely untouched." Here are the largest source files and recommendations:

#### Backend — Largest Files (>400 lines)

| File | Lines | Recommendation |
|------|-------|----------------|
| `services/printing/BrowserPrintingService.ts` | 564 | Acceptable for a printing service with multiple methods. Could extract printer-specific logic into smaller modules if it grows. |
| `routes/auth.ts` | 478 | **Already refactored** — middleware moved to `middleware/auth.ts`. Routes file could be split: `auth/login.ts`, `auth/register.ts`, `auth/users.ts`, `auth/me.ts` if it grows further. |
| `routes/printing.ts` | 477 | Consider splitting: `printing/receipts.ts`, `printing/thermal.ts`, `printing/status.ts`. |
| `routes/userManagement/roles/RoleValidator.ts` | 444 | Dense validation logic. Could extract validation rules into a separate `RoleValidationRules.ts`. |
| `utils/database/sharedQueries.ts` | 430 | Shared queries — fine as-is. Could group by domain (users, establishments, invitations) if it grows. |
| `services/setup/wizard/SetupWizard.ts` | 420 | Complex wizard — acceptable. Steps are already in separate files. |
| `models/establishment.ts` | 414 | Model file — reasonable size. |
| `routes/userManagement/invitationRoutes.ts` | 410 | Could extract handlers into `invitationHandlers.ts` if needed. |
| `models/archiveService.ts` | 410 | Archive logic — acceptable. |

**Verdict:** No critical refactoring needed. The modular split (orders/, legal/, userManagement/) is already in place. The largest files are domain-heavy (setup wizard, printing, roles) and can stay as-is unless they exceed ~600 lines.

---

### 3. Architecture Assessment

#### 3.1 Strengths ✅

| Aspect | Status | Notes |
|--------|--------|-------|
| **Layered architecture** | ✅ | Routes → Middleware → Services → Models → DB. Clear separation. |
| **Modular routes** | ✅ | `orders/`, `legal/`, `userManagement/` split into sub-routers. |
| **Single source of truth** | ✅ | User types in `models/user.ts` (backend) and `types/auth.ts` (frontend). Permissions in `ALL_PERMISSIONS`. |
| **Custom hooks pattern** | ✅ | usePOSState, usePOSLogic, usePOSAPI — separation of state, logic, API. |
| **Multi-tenant scoping** | ✅ | `establishment_id` on categories, products, orders. Routes extract from `req.user`. |
| **Legal compliance structure** | ✅ | legal_journal, closure_bulletins, audit_trail, archive_exports — ISCA pillars in place. |
| **Environment validation** | ✅ | `config/environment.ts` validates on startup. |
| **Migration system** | ✅ | CLI for migrations, version tracking. |

#### 3.2 Gaps & Improvements

| Aspect | Issue | Recommendation |
|--------|-------|----------------|
| **Dual error handlers** | `errorHandler.ts` and `errorHandling.ts` both exist. `createErrorHandler` vs `createEnhancedErrorHandler`. | Consolidate into one module. Use enhanced handler everywhere; deprecate the simple one. |
| **Controller layer inconsistency** | OrderController exists but isn't used. Other routes (products, categories) call models directly. | Choose one pattern: either adopt controllers for all routes or remove OrderController. |
| **establishments vs enhanced-establishments** | Two route sets for establishments. | Document clearly: `/api/establishments` = basic CRUD; `/api/enhanced-establishments` = creation workflow + stats. Not redundant — different purposes. |
| **Legal tables without establishment_id** | Legal journal, closure_bulletins, etc. don't have `establishment_id` yet. | Add migration + model changes for multi-tenant legal compliance (future work). |
| **Order creation flow** | orderCRUD.ts doesn't write to legal journal or audit trail. | Wire LegalJournalModel.logTransaction and AuditTrailModel.logAction in order creation (Fix 1 in DEVELOPMENT-STATE.md). |

#### 3.3 Enterprise Best Practices Checklist

| Practice | Status |
|----------|--------|
| Environment-based config | ✅ |
| Structured logging | ✅ |
| Input validation middleware | ✅ |
| Rate limiting | ✅ |
| CORS configuration | ✅ |
| Parameterized SQL (no injection) | ✅ |
| JWT with expiry | ✅ |
| Password hashing (bcrypt) | ✅ |
| Error boundaries (frontend) | ✅ |
| Migration-based schema changes | ✅ |
| API documentation (Swagger) | ✅ (`/api/docs`) |
| Health check endpoint | ✅ |

**Overall:** The architecture is solid and aligns with enterprise patterns. The main gaps are the 7 critical fixes in DEVELOPMENT-STATE.md (legal journal, retour/change routing, etc.) and minor cleanup (dead code, debug logs).

---

## Part II — Full Course: Every File Explained

This section walks you through the project so you can explain every part to someone else.

---

### A. Project Root & Top-Level Structure

```
MOSEHXL/
├── MuseBar/           # The main application (frontend + backend)
├── docs/              # Documentation (this file, architecture, deep-dives)
├── scripts/           # Deployment and setup scripts
├── backups/           # Database backups (gitignored)
├── README.md          # Project overview, quick start, legal compliance summary
└── DEVELOPMENT-STATE.md  # Current state, 7 critical fixes, known issues
```

**Why this structure?** `MuseBar` is the product name. Backend and frontend live inside it because they're deployed together. `docs/` keeps all learning material in one place.

---

### B. Backend Structure (`MuseBar/backend/`)

#### B.1 Entry Point: `src/app.ts`

**What it does:** Creates the Express app, configures middleware, mounts all routes, starts the server.

**Key sections:**
1. **Environment** — `initializeEnvironment()` loads and validates `.env`
2. **Middleware order** — CORS → express.json() → request logger → security (rate limit, sanitization)
3. **Database** — `pool` from `pg` with `options: '--timezone=Europe/Paris'`
4. **Routes** — All `/api/*` routes mounted here
5. **Error handling** — `notFound` then `createEnhancedErrorHandler`
6. **Closure scheduler** — Started in production only (02:00 Paris time)

**Why `pool` is exported:** Routes and models need DB access. Exporting from `app.ts` avoids circular imports (config is loaded here).

---

#### B.2 Config: `src/config/`

| File | Purpose |
|------|---------|
| `environment.ts` | Reads `process.env`, validates required vars (DB_*, JWT_SECRET, etc.), returns typed `EnvironmentConfig`. Fails fast on startup if invalid. |
| `database.ts` | Legacy/unused — pool is in app.ts. Can be removed or used for connection testing. |

---

#### B.3 Middleware: `src/middleware/`

| File | Purpose |
|------|---------|
| `auth.ts` | **Canonical auth middleware.** `requireAuth` (JWT verify), `requireAdmin`, `requireEstablishmentAdmin`, `requirePermission`, `generateToken`, `verifyToken`. Used by routes that need protection. |
| `validation.ts` | `validateBody`, `validateParams`, `commonValidations`, `paramValidations`. Reusable rules for request validation. |
| `errorHandler.ts` | `AppError`, `ValidationError`, `asyncHandler`, `createErrorHandler`, `notFound`. Base error types and simple handler. |
| `errorHandling.ts` | `createEnhancedErrorHandler` — richer logging, request ID, stack traces. This is what app.ts uses. |
| `security/` | Rate limiting, CORS, input sanitization, security headers. Composed in `createSecurityMiddleware`. |

**Why two error handlers?** Historical. `errorHandler.ts` has `AppError` and `asyncHandler` used everywhere. `errorHandling.ts` has the enhanced handler. Consolidation would clean this up.

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
| `userManagement/` | `/api/user-management` | Only invitations mounted; user/team/role routes dismounted |
| `establishments.ts` | `/api/establishments` | Basic establishment CRUD (system admin) |
| `enhancedEstablishments.ts` | `/api/enhanced-establishments` | Creation workflow, stats |
| `setup.ts` | `/api/setup` | Business setup wizard |
| `establishmentAccountCreation.ts` | `/api/establishment-account-creation` | Invitation acceptance flow |
| `printing.ts` | (mounted elsewhere) | Receipt printing, thermal |
| `docs.ts` | `/api/docs` | Swagger/OpenAPI |

**Orders sub-routes:**
- `orderCRUD.ts` — GET/POST/PUT/DELETE for orders (the main order creation lives here)
- `orderPayment.ts` — Retour, cancel-unified (refunds/cancellations)
- `orderLegal.ts` — Legal journal endpoints for orders
- `orderAudit.ts` — Audit trail (currently stubbed)

---

#### B.5 Models: `src/models/`

Models wrap SQL in TypeScript. One model per table (roughly).

| Model | Table(s) | Purpose |
|-------|----------|---------|
| `user.ts` | users, user_permissions | UserRow, AuthenticatedUser, findByEmail, verifyPassword, getUserPermissions |
| `index.ts` | categories, products, orders, order_items, sub_bills | CategoryModel, ProductModel, OrderModel, etc. |
| `establishment.ts` | establishments | EstablishmentModel |
| `auditTrail.ts` | audit_trail | AuditTrailModel.logAction |
| `legalJournal/` | legal_journal, closure_bulletins | Legal journal operations, closure creation |
| `archiveService.ts` | archive_exports | Archive export creation and verification |

**Interfaces:** `models/interfaces/index.ts` defines shared types (Category, Product, Order, etc.) used by models and routes.

---

#### B.6 Services: `src/services/`

Business logic that doesn't fit in a single route or model.

| Service | Purpose |
|---------|---------|
| `orderService.ts` | **Dead code** — not used. Would orchestrate order creation with validation. |
| `email/` | SendGrid integration, templates, EmailLogger |
| `setup/` | Setup wizard steps, validation, database seeding |
| `establishment/` | Establishment creation, search, status transitions |
| `establishmentAccountCreation/` | Invitation acceptance, schema operations |
| `userInvitation/` | Invitation creation, email, acceptance |
| `printing/` | Browser, network, PrintNode, StarCloudPRNT, composite |
| `receipts/` | Digital, email, QR receipts |

---

#### B.7 Utils: `src/utils/`

| File/Folder | Purpose |
|-------------|---------|
| `logger/` | Structured logging, request logger middleware |
| `closureScheduler.ts` | Cron-like job: daily closure at 02:00 Paris time |
| `thermalPrint/` | Thermal printer queue, formatters, templates |
| `database/sharedQueries.ts` | Reusable SQL for users, establishments, invitations |
| `errors/` | Standard error handler |
| `errorRecovery.ts` | Error recovery system initialization |

---

#### B.8 Migrations: `src/migrations/`

- `cli.ts` — Migration CLI (`npm run migration:migrate`, etc.)
- `migration-manager.ts` — Applies migrations, tracks version
- `files/` — SQL migration files (e.g. `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql`)

---

### C. Frontend Structure (`MuseBar/src/`)

#### C.1 Entry Points

| File | Purpose |
|------|---------|
| `index.tsx` | React entry — renders `<App />` into `#root` |
| `App.tsx` | Root component — routing (setup, establishment-setup, main app), auth detection |

---

#### C.2 Components: `src/components/`

Each major feature has a Container + sub-components.

| Component | Purpose |
|-----------|---------|
| `POS/` | Point of sale — ProductGrid, OrderSummary, PaymentDialog, SplitPayment |
| `Menu/` | Category and product management — CategorySection, ProductSection, dialogs |
| `History/` | Order history — StatsCards, SearchBar, OrdersTable |
| `Settings/` | Business info, closure, printer, payment settings |
| `Legal/` | Legal compliance dashboard, receipts |
| `Closure/` | Closure bulletin management |
| `HappyHour/` | Happy hour control and schedule |
| `Auth/` | Login form |
| `Admin/` | User management, audit trail, establishment management |
| `SystemAdmin/` | System admin UI — establishments, users, security logs |
| `Setup/` | Business setup wizard |
| `EstablishmentAccountCreation/` | Invitation-based signup flow |
| `common/` | AppRouter, ErrorBoundary, loaders, SystemAdminRouter |

**AppRouter** — Tab visibility: `establishment_admin` sees admin tabs; cashiers see tabs based on `user.permissions`.

---

#### C.3 Hooks: `src/hooks/`

Custom hooks separate state, logic, and API calls.

| Hook | Purpose |
|------|---------|
| `usePOSState.ts` | Cart, dialogs, payment method, retour/change state |
| `usePOSLogic.ts` | Filtered products, totals, tax, "can pay?" |
| `usePOSAPI.ts` | createOrder, processRetour, processChange (calls `/api/orders`) |
| `useHistoryState.ts` | Order list, search, return dialog state |
| `useHistoryAPI.ts` | loadOrders, processReturn |
| `useMenuState.ts` | Categories, products, dialog state |
| `useMenuAPI.ts` | CRUD for categories and products |
| `useAuth.ts` | Login, logout, token, permissions, refresh |
| `useHappyHour.ts` | Happy hour active state |
| `useDataManagement.ts` | Load categories, products; refresh |
| `useSettings.ts` | Load/save business and closure settings |
| `useEstablishments.ts` | System admin — load establishments |
| `usePermissions.ts` | Re-exports ALL_PERMISSIONS from types |

---

#### C.4 Services: `src/services/`

| File | Purpose |
|------|---------|
| `apiService.ts` | Central API — get, post, put, delete. Token attachment. |
| `api/core.ts` | Low-level fetch wrapper, base URL, auth header |
| `api/categories.ts`, `products.ts`, `legal.ts` | Domain-specific API helpers |
| `dataService.ts` | Load and cache categories, products |
| `happyHourService.ts` | Happy hour time calculation |
| `establishmentService.ts` | System admin — create, get, delete establishments, stats |
| `authHelper.ts` | Auth-related helpers |

---

#### C.5 Types: `src/types/`

| File | Purpose |
|------|---------|
| `auth.ts` | User, EstablishmentMember, ALL_PERMISSIONS — **frontend SSOT** |
| `business.ts` | Category, Product, HappyHourSettings |
| `orders.ts` | Order, OrderItem, PaymentMethod |
| `system.ts` | SystemEstablishment, etc. |
| `ui.ts` | UI-specific types |

---

#### C.6 Config: `src/config/api.ts`

Detects API URL: production → `https://mosehxl.com/api`; development → `http://localhost:3001`. Uses `fetch('/api/health')` to test.

---

### D. Data Flow: Click to Database

**Example: User clicks "Pay" for a 15€ card payment**

1. **PaymentDialog** → `handleSimplePayment()` in usePaymentProcessing
2. **usePaymentProcessing** → assembles order payload
3. **usePOSAPI.createOrder** → `apiService.post('/orders', payload)`
4. **apiService** → `fetch('http://localhost:3001/api/orders', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: 'Bearer ...' } })`
5. **Express** → matches `POST /api/orders` to orderCRUDRouter
6. **orderCRUD** → `requireAuth` runs, then handler
7. **Handler** → `OrderModel.create()`, `OrderItemModel.create()`, `SubBillModel.create()` (if split)
8. **Models** → `pool.query('INSERT INTO orders ...')`
9. **Response** → `res.status(201).json({ ...order, items, sub_bills })`
10. **Frontend** → `onOrderComplete()` clears cart, shows success

**What's missing (Fix 1):** After step 7, we should call `LegalJournalModel.logTransaction()` and `AuditTrailModel.logAction()` for compliance.

---

### E. Improvements You Could Make

1. **Wire legal journal on order creation** — Fix 1 in DEVELOPMENT-STATE.md
2. **Fix retour/change routing** — Frontend should call `/api/orders/payment/retour` and `cancel-unified`, not `POST /api/orders` — Fix 3
3. **Remove dead code** — OrderController, OrderService; optionally userRoutes, teamRoutes if truly unused
4. **Remove debug logs** — useAuth.ts and elsewhere
5. **Consolidate error handlers** — One module, one handler
6. **Add Retour and Change dialogs** — POSContainer and HistoryContainer have state but no UI (Fix 6, 7)
7. **Pass onDataUpdate to PaymentDialog** — So history refreshes after payment (Fix 7)

---

## Part III — Quick Reference: File → Purpose

| Path | One-line purpose |
|------|------------------|
| `app.ts` | Express app, middleware, routes, DB pool, server start |
| `config/environment.ts` | Load and validate .env |
| `middleware/auth.ts` | JWT verify, requireAuth, requireAdmin, requirePermission |
| `middleware/validation.ts` | validateBody, validateParams, commonValidations |
| `middleware/errorHandler.ts` | AppError, asyncHandler, notFound |
| `middleware/errorHandling.ts` | createEnhancedErrorHandler |
| `routes/auth.ts` | Login, register, /me, /users, permissions |
| `routes/orders/orderCRUD.ts` | Order CRUD — **main order creation** |
| `routes/orders/orderPayment.ts` | Retour, cancel |
| `models/user.ts` | UserRow, getUserPermissions |
| `models/index.ts` | OrderModel, ProductModel, CategoryModel, etc. |
| `services/orderService.ts` | **Dead** — order creation orchestration |
| `controllers/orderController.ts` | **Dead** — never used |
| `utils/closureScheduler.ts` | Daily closure at 02:00 Paris |
| `src/App.tsx` | Root routing, auth detection |
| `src/components/common/AppRouter.tsx` | Tab visibility by role/permission |
| `src/hooks/useAuth.ts` | Token, user, login, logout |
| `src/hooks/usePOSAPI.ts` | createOrder, processRetour |
| `src/services/apiService.ts` | HTTP client, token |
| `src/types/auth.ts` | User, ALL_PERMISSIONS — frontend SSOT |

---

## Summary

- **Audit:** Dead code (OrderController, OrderService), unused imports, debug logs. Architecture is solid.
- **Large files:** None critical; modular split is in place.
- **Architecture:** Enterprise-grade patterns; main gaps are the 7 fixes in DEVELOPMENT-STATE.md.
- **Course:** This document explains every major file and data flow. Use it with the existing docs (01–07) for a complete picture.

For the 7 critical fixes and migration plan, see **DEVELOPMENT-STATE.md**.
