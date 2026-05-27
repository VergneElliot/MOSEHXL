# 331 — P3-Q8 unified 4xx sweep (invitations + products + setup pass) implementation

## What changed

### 1) Migrated invitations/products/setup 4xx branches to typed errors

Updated:

- `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`
- `MuseBar/backend/src/routes/products.ts`
- `MuseBar/backend/src/routes/setup.ts`

Changes:

- Replaced ad-hoc 4xx response branches with typed errors:
  - `ValidationError`
  - `NotFoundError`
  - `AuthorizationError`
- Preserved domain-level success payloads and existing 5xx handling patterns.
- Added `AppError` rethrow guards in products/setup catch paths so typed 4xx errors are not coerced into 500 responses.

### 2) Route-specific details

- **Products**
  - Migrated manual validation failures and not-found branches (`GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `PUT /:id/restore`) to typed errors.
  - Preserved audit logging flow and 5xx deletion fallback behavior.

- **Setup**
  - Migrated invalid invitation validation, missing setup status, and failed setup completion branches to typed errors.
  - Preserved returned service payload in error details where practical for debugging.
  - Added `AppError` passthrough in all catch paths.

- **Invitations**
  - Migrated field validation, establishment access-denied, role validation, missing establishment/invitation, and failed acceptance/resend validation branches to typed errors.
  - Kept success payload contract for successful invitation operations.

### 3) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Change:

- Marked `P3-Q8` as fixed after completing all planned route-family migrations.

## Verification

- `npm run type-check` ✅
- `npm run test` ✅

## Notes

- This pass closes the remaining `P3-Q8` domains and completes the unified 4xx migration item for this audit cycle.
