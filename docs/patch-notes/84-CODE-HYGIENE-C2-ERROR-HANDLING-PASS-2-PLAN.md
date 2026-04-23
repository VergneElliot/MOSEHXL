# 84 - Code Hygiene C2 (Error Handling Consolidation Pass 2) - Plan

Date: 2026-04-23  
Phase: C2 follow-up from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this follow-up exists

Patch `83` removed silent audit failures and fixed `legal/businessInfo` logger usage.
Remaining C2 work is to standardize route-level error propagation from `try/catch + res.status(...)` toward `asyncHandler + AppError`.

## Scope of pass 2

Target route files for this pass:

- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/routes/authRegister.ts`
- `MuseBar/backend/src/routes/products.ts`
- `MuseBar/backend/src/routes/categories.ts`

These files already received C2 pass 1 hardening and are the highest-leverage places to complete the pattern shift with low regression risk.

## Planned changes

1. Use `asyncHandler(...)` wrappers on route handlers in scope.
2. Replace remaining `catch { res.status(...).json(...) }` blocks with:
   - `Logger.getInstance().error(...)` when useful context is available, then
   - `throw new AppError(...)`.
3. Keep functional behavior the same for explicit user-facing validation paths (400/401/403/404 guards).
4. Preserve audit logging guarantees added in pass 1 (`logAuditOrThrow`).

## Verification plan

- Run search checks in scoped files for residual direct `res.status(...).json(...)` inside catch blocks.
- Run backend validation:
  - `npm run type-check`
  - `npm test`
- Run lint diagnostics on edited files.

## Acceptance criteria

- Scoped files use `asyncHandler + AppError` for server-error paths.
- No silent catches reintroduced.
- Typecheck/tests pass.
