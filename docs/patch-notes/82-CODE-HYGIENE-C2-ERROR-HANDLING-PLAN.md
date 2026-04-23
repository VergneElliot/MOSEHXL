# 82 - Code Hygiene C2 (Error Handling Consolidation) - Plan

Date: 2026-04-23  
Phase: C2 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

Phase C2 targets consistency and legal/audit robustness in backend error handling:

- stop silent audit failures,
- normalize route error propagation,
- replace ad-hoc console error logging in API routes.

Silent failures in `audit_trail` logging are specifically high risk for compliance traceability.

## Findings from pre-implementation mapping

Detected silent catches (`.catch(() => {})`) in:

- `routes/authLogin.ts`
- `routes/authRegister.ts`
- `routes/products.ts`
- `routes/categories.ts`

Detected API route `console.error` usage in:

- `routes/legal/businessInfo.ts`

## Scope of this C2 pass

### In scope

1. Replace all currently detected silent audit catches with explicit handling:
   - `logger.error(...)`
   - throw `AppError(...)` (no silent swallow)
2. Update `routes/legal/businessInfo.ts`:
   - remove `console.error`
   - use `Logger` + `asyncHandler` + `AppError`
3. Keep response behavior stable for successful paths.

### Out of scope for this pass

- Full repo-wide migration of every route `try/catch` to `asyncHandler` in one PR-sized change.
- CLI/migration-layer `console.error` usage (non-HTTP command-line context).

These remain candidates for a follow-up C2 pass.

## Step-by-step execution plan

### Step 1 - Documentation first
- Add this plan doc and link it from the audit C2 section.

### Step 2 - Implement C2 pass 1 changes
- Add explicit audit logging helper(s) in touched route files.
- Convert `businessInfo` route handlers to `asyncHandler` + `AppError`.

### Step 3 - Verify
- Search for remaining `.catch(() => {})` in backend routes.
- Run backend checks:
  - `npm run type-check`
  - `npm test`

### Step 4 - Implementation doc
- Add implementation patch note with:
  - exact files touched,
  - verification results,
  - explicit remaining C2 follow-up scope.

## Acceptance criteria for this pass

- No `.catch(() => {})` remains in backend route files.
- `routes/legal/businessInfo.ts` no longer uses `console.error`.
- Changes compile and tests pass.
