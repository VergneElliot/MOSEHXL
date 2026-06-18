# 330 — P3-Q8 unified 4xx sweep (invitations + products + setup pass) plan

## Objective

Complete `P3-Q8` by migrating remaining ad-hoc invitations/products/setup `res.status(4xx).json(...)` branches to typed error classes and centralized middleware handling.

## Scope

### In scope

- Convert 4xx branches in:
  - `userManagement/invitationRoutes.ts`
  - `products.ts`
  - `setup.ts`
- Add catch-path guards where needed so typed errors are not converted to 500 responses.
- Re-verify backend type-check + full test suite.
- Mark `P3-Q8` complete in the audit tracker if this pass closes remaining domains.

### Out of scope

- Unrelated 4xx branches outside `P3-Q8` target domains.
- Additional behavior changes to 5xx branches beyond preserving existing handling.

## Design decisions

1. Use `ValidationError` for request/business-validation failures in invitation/setup/product write flows.
2. Use `NotFoundError` for missing resources (`Product`, `Invitation`, `Establishment`, setup status not found).
3. Use `AuthorizationError` for explicit establishment access-denied branches.
4. Preserve domain 5xx wrappers and route logging, with `AppError` rethrow guards where needed.

## Verification plan

- `npm run type-check` (backend)
- `npm run test` (backend full suite)
