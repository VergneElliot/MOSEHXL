# 83 - Code Hygiene C2 (Error Handling Consolidation) - Implementation

Date: 2026-04-23  
Status: **Implemented (C2 pass 1)**  
Plan reference: `docs/patch-notes/82-CODE-HYGIENE-C2-ERROR-HANDLING-PLAN.md`.

## 1) What was fixed

### 1.1 Silent audit failures removed

Replaced every detected route-level `.catch(() => {})` on `AuditTrailModel.logAction(...)` with explicit handling that:

- logs via `Logger.getInstance().error(...)`,
- throws `AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', ...)`.

Files updated:

- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/routes/authRegister.ts`
- `MuseBar/backend/src/routes/products.ts`
- `MuseBar/backend/src/routes/categories.ts`

Each file now uses a local `logAuditOrThrow(...)` helper to avoid silent swallow behavior.

### 1.2 Legal business info route aligned to logger + centralized error path

Updated:

- `MuseBar/backend/src/routes/legal/businessInfo.ts`

Changes:

- Removed `console.error(...)`.
- Added `Logger` logging with route context (`LEGAL_ROUTE`).
- Wrapped handlers with `asyncHandler(...)`.
- Raised `AppError(...)` on fetch/save failure.

## 2) Documentation linkage

Updated audit cross-reference in:

- `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

to point to:

- `82` (plan)
- `83` (implementation)

## 3) Verification

Pattern checks:

- No remaining `.catch(() => {})` in backend source routes ✅
- No `console.error` in `routes/legal/businessInfo.ts` ✅

Build/test checks (run in `MuseBar/backend`):

- `npm run type-check` ✅
- `npm test` ✅ (`6` files, `17` tests)

## 4) Remaining C2 follow-up scope

This pass focused on the highest-risk C2 defects (silent audit failures + legal route console logging).

Still open for follow-up C2 pass:

- broader migration of route-level `try/catch + res.status(...)` patterns to fully standardized `asyncHandler + AppError` across all backend route files.
