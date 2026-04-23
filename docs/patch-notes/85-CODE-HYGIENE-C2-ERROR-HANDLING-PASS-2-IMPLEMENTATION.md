# 85 - Code Hygiene C2 (Error Handling Consolidation Pass 2) - Implementation

Date: 2026-04-23  
Status: **Implemented**  
Plan reference: `docs/patch-notes/84-CODE-HYGIENE-C2-ERROR-HANDLING-PASS-2-PLAN.md`.

## 1) What was implemented

C2 pass 2 completed the pattern shift in the scoped route files from:

- route-level `try/catch + res.status(...).json(...)`

to:

- `asyncHandler(...)` route wrappers
- `throw new AppError(...)` for server-error paths

Files updated:

- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/routes/authRegister.ts`
- `MuseBar/backend/src/routes/products.ts`
- `MuseBar/backend/src/routes/categories.ts`

## 2) Key changes by area

### 2.1 Auth routes

- Wrapped main handlers with `asyncHandler`.
- Replaced server-failure catch responses with `AppError` throws:
  - login / me / refresh
  - support impersonation start / stop
  - setup bootstrap catch path
- Kept explicit validation/authorization responses (`400/401/403/404`) intact.

### 2.2 Products and categories routes

- Wrapped endpoints with `asyncHandler`.
- Replaced catch-response blocks with `AppError` throws carrying route-specific error codes.
- Preserved existing business guard responses and not-found behavior.
- Kept pass-1 audit guarantees (`logAuditOrThrow`) unchanged.

## 3) Verification

Executed in `MuseBar/backend`:

- `npm run type-check` ✅
- `npm test` ✅ (`6` files, `17` tests)

Additional checks:

- No remaining `catch ... res.status(...)` blocks in scoped pass-2 files ✅
- No linter issues in touched files ✅

## 4) C2 status after pass 2

- C2 pass 1 and pass 2 together now cover:
  - silent audit swallow removal,
  - legal route logger alignment,
  - standardized async error propagation across key auth/catalog route families.

Remaining C2 work can continue as optional incremental passes for route families not yet migrated.
