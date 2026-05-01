# 258 - P2-Q13 (unified error handler sweep, pass 2) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (Q13)

## Why this patch exists

After pass 1, four files still used ad-hoc `res.status(500).json(...)`:

1. `routes/printing.ts`
2. `routes/printingCompat.ts`
3. `routes/establishmentAccountCreation/middleware/validateInvitation.ts`
4. `routes/establishmentAccountCreation/middleware/validateBusinessInfo.ts`

This pass closes the remaining Q13 surface.

## Scope

### In scope

1. Replace remaining route-level 500 JSON branches with `AppError`.
2. Wrap async route handlers with `asyncHandler` where needed.
3. Convert middleware-level internal-error responses to `next(new AppError(...))`.

### Out of scope

- Functional changes to printing behavior, invitation validation semantics, or
  business validation rules.
- UI/API payload redesign beyond unified error envelope adoption.

## Strategy

### Step 1 - Printing routes

In `printing.ts` and `printingCompat.ts`:
1. add `asyncHandler` + `AppError` integration,
2. preserve explicit 400/404 responses,
3. convert fallback 500 branches to thrown `AppError` with explicit error codes.

### Step 2 - Establishment-account-creation middlewares

In `validateInvitation.ts` and `validateBusinessInfo.ts`:
1. keep 400 validation responses unchanged,
2. route internal failures through `next(new AppError(...))`.

### Step 3 - Verify

Run type-check, targeted tests, lint diagnostics, and a final grep proving no
`res.status(500).json(` remains under `backend/src/routes`.

## Acceptance criteria

1. `backend/src/routes/**` has no ad-hoc 500 JSON responses.
2. Remaining Q13 pass 2 files use unified AppError/error middleware flow.
