# 104 - P0-4 (C2 Continuation: orderCRUD Error Handling Consolidation) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

The latest full audit still identified `orderCRUD.ts` as a core C2 gap:

- multiple empty `catch {}` blocks,
- inconsistent route-level error handling,
- partial bypass of unified `asyncHandler + AppError` standards.

This patch closes the `orderCRUD` portion of C2 continuation.

## Scope

### In scope

1. Convert `orderCRUD` route handlers to `asyncHandler(...)`.
2. Replace empty catches with explicit logger + `AppError` propagation.
3. Preserve existing functional behavior and status semantics for known business branches.
4. Verify via existing order route tests plus type-check.
5. Document plan/implementation.

### Out of scope

- Full C2 completion across all remaining route files.
- Permission model expansions (A4 continuation) beyond `orderCRUD`.

## Design choices

- Keep established guard flow (`getEstablishmentId(req, res)` early-return).
- Keep explicit 404/403 business responses where they are part of route contract.
- Use `AppError` only for unexpected/server failures.
- Preserve P0-2 fail-safe behavior for completed sale legal journal persistence.

## Step-by-step plan

### Step 1 - Route modernization
- Import `asyncHandler` and `AppError` in `orderCRUD.ts`.
- Wrap GET/POST/PUT/DELETE handlers in `asyncHandler`.

### Step 2 - Remove empty catches
- Replace empty catches with:
  - contextual `logger.error(...)`,
  - `throw new AppError(...)`.

### Step 3 - Verification
- Run:
  - `npm run test -- src/routes/orders/orderCRUD.journalFailSafe.test.ts src/routes/orders/orderCRUD.establishmentIsolation.test.ts`
  - `npm run type-check`

### Step 4 - Documentation
- Add implementation patch note with changes and verification output.

## Acceptance criteria

- No empty `catch {}` blocks remain in `orderCRUD.ts`.
- `orderCRUD` handlers use `asyncHandler`.
- Route tests pass.
- Backend type-check passes.
