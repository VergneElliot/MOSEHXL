# 329 — P3-Q8 unified 4xx sweep (legal + printing pass) implementation

## What changed

### 1) Migrated legal + printing 4xx branches to typed errors

Updated:

- `MuseBar/backend/src/routes/legal/archive.ts`
- `MuseBar/backend/src/routes/legal/closure.ts`
- `MuseBar/backend/src/routes/legal/compliance.ts`
- `MuseBar/backend/src/routes/legal/journal.ts`
- `MuseBar/backend/src/routes/printing.ts`
- `MuseBar/backend/src/routes/printingCompat.ts`

Changes:

- Replaced ad-hoc 4xx response branches with typed errors:
  - `ValidationError`
  - `NotFoundError`
  - `AuthorizationError`
  - `ConflictError`
- Preserved 5xx domain behavior through existing `AppError` codes.
- Added explicit `if (error instanceof AppError) throw error;` guards in catch blocks that can now receive typed 4xx errors, preventing incorrect 500 coercion.

### 2) Updated tests for centralized 4xx error envelope

Updated:

- `MuseBar/backend/src/routes/printing.routes.test.ts`
- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`
- `MuseBar/backend/src/routes/legal/legalPermissionGates.test.ts`

Changes:

- Updated assertions from legacy `res.body.error` string checks to unified `res.body.error.message` checks for migrated paths.
- Mounted `errorHandler` in legal permission-gate tests so thrown typed errors are normalized through the shared middleware.
- Adjusted monthly closure-not-found expectation to match `NotFoundError` message shape.

### 3) Updated audit tracker status

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Marked `P3-Q8` as in progress with `auth + legal + printing` now migrated, and `invitations/products/setup` remaining.

## Verification

- `npm run type-check` ✅
- `npm run test -- src/routes/printing.routes.test.ts src/routes/legal/legalArchiveClosure.permissions.test.ts src/routes/legal/legalPermissionGates.test.ts` ✅
- `npm run test` ✅

## Notes

- This pass closes legal + printing for `P3-Q8` and leaves the final tranche (`invitations`, `products`, `setup`) for completion.
