# 317 — P3-S11 production default explicit admin permissions (implementation)

## What changed

### 1) Production default switched to explicit-only mode

Updated:

- `MuseBar/backend/src/models/user.ts`
- `MuseBar/backend/src/config/environment.ts`

Changes:

- Permission mode resolution now:
  - honors explicit env setting when provided,
  - otherwise defaults to `explicit_only` in production,
  - keeps `implicit_all` default outside production.
- Updated inline comments to reflect least-privilege production default.

### 2) Added regression coverage for production fallback

Updated:

- `MuseBar/backend/src/models/user.permissionMode.test.ts`

Changes:

- Added test asserting production default uses explicit-only path when mode is unset.
- Kept existing coverage for:
  - non-production implicit default,
  - explicit env override.
- Added cleanup for `NODE_ENV` restoration after test execution.

### 3) Documented environment behavior

Updated:

- `MuseBar/backend/.env.example`

Changes:

- Added `ESTABLISHMENT_ADMIN_PERMISSION_MODE=` with a comment describing production/non-production defaults.

## Verification

- `npm run type-check` ✅
- `npm test -- src/models/user.permissionMode.test.ts` ✅
- `npm test` ✅

## Notes

- This closes `P3-S11` by making production least-privilege the default for establishment-admin permissions without breaking local development ergonomics.
