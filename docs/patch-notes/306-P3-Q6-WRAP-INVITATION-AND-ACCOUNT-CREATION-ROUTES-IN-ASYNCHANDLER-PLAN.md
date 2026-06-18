# 306 — P3-Q6 wrap invitation/account-creation routes in `asyncHandler` (plan)

## Objective

Close the remaining async route wrapper gap by migrating invitation and establishment-account-creation routes to `asyncHandler`.

## Scope

### In scope

- Wrap async handlers in:
  - `routes/userManagement/invitationRoutes.ts`
  - `routes/establishmentAccountCreation/index.ts`
- Preserve endpoint behavior and response payloads.
- Keep existing route-level logging, but forward errors via throw (captured by `asyncHandler`).

### Out of scope

- Functional changes to invitation/account creation workflows.
- Response schema redesign.

## Design decisions

1. Replace `next(error)` paths with `throw error` inside wrapped handlers.
2. Keep current 4xx explicit responses unchanged to avoid behavior drift.
3. Keep route module signatures simple by removing unnecessary `NextFunction` types where no longer needed.

## Verification plan

- Backend type-check.
- Full backend test suite.
