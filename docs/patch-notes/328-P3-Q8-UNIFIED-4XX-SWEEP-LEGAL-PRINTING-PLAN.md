# 328 — P3-Q8 unified 4xx sweep (legal + printing pass) plan

## Objective

Continue `P3-Q8` by migrating ad-hoc legal/printing-route `res.status(4xx).json(...)` branches to typed error classes with centralized handling.

## Scope

### In scope

- Convert legal + printing 4xx branches in:
  - `legal/archive.ts`
  - `legal/closure.ts`
  - `legal/compliance.ts`
  - `legal/journal.ts`
  - `printing.ts`
  - `printingCompat.ts`
- Ensure typed errors are not swallowed by route-level catch blocks.
- Update affected tests to assert centralized error envelope where applicable.

### Out of scope

- Remaining `P3-Q8` route families (`invitations`, `products`, `setup`) in this pass.
- Any behavior changes to 5xx fallbacks beyond preserving existing semantics.

## Design decisions

1. Use `ValidationError`, `NotFoundError`, `AuthorizationError`, and `ConflictError` for 4xx route branches.
2. Keep `AppError` for non-4xx route failures and existing domain-specific 5xx codes.
3. In catch blocks that now receive typed 4xx errors, rethrow `AppError` early to avoid accidental 500 wrapping.

## Verification plan

- Backend type-check.
- Targeted legal/printing route tests.
- Full backend test suite.
