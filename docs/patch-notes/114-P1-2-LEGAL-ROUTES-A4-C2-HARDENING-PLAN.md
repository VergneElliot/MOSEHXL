# 114 - P1-2 (Legal Routes A4 + C2 Hardening) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

Remaining legal-route gaps include:

1. **A4 permission gap**: key legal read endpoints still rely on auth-only/admin-only patterns without explicit compliance permission checks.
2. **C2 consistency gap**: legal route files still use local try/catch + ad-hoc 500 responses instead of unified `asyncHandler + AppError`.

## Scope

### In scope

1. Harden legal route permission model for:
   - `legal/journal.ts` (`/verify`, `/entries`)
   - `legal/compliance.ts` (`/status`, `/report`, `/requirements`)
   - `legal/stats.ts` (`/monthly-live`)
2. Migrate these files to `asyncHandler + AppError` style.
3. Replace `process.stderr` logging with structured logger usage where touched.
4. Add focused regression tests for new permission gates.
5. Document and verify.

### Out of scope

- `businessDayStats.ts` permission semantics (kept as-is by design for authenticated establishment users).
- Full legal route refactor in one shot.

## Design choices

- Use `requirePermission(P.access_compliance)` for compliance/legal-read surfaces.
- Preserve existing response payload shape on success paths.
- Convert only touched files to avoid broad behavioral churn.

## Step-by-step plan

### Step 1 - Permission hardening
- Add `requirePermission(P.access_compliance)` on target endpoints in `journal.ts`, `compliance.ts`, `stats.ts`.

### Step 2 - C2 error flow hardening
- Wrap handlers in `asyncHandler`.
- Replace local catch+response branches with logger + `AppError` throws.

### Step 3 - Regression tests
- Add legal route permission tests covering:
  - denied access without `access_compliance`,
  - allowed access with `access_compliance`.

### Step 4 - Verification and docs
- Run targeted route tests and backend type-check.
- Add implementation patch note with verification outputs.

## Acceptance criteria

- Target legal read endpoints require explicit compliance permission.
- Touched legal route files use centralized error flow.
- Regression tests pass.
- Backend type-check passes.
