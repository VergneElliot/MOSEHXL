# 323 — P3-S14 extend log redaction token fields (implementation)

## What changed

### 1) Request logger now explicitly redacts refresh/invitation token fields

Updated:

- `MuseBar/backend/src/utils/logger/requestLogger.ts`

Changes:

- Added `x-refresh-token` to sensitive request headers.
- Added `refresh_token` and `invitation_token` to sensitive body field patterns.

### 2) Client-error payload redaction now explicitly covers refresh/invitation token keys

Updated:

- `MuseBar/backend/src/utils/clientErrorReporting.ts`

Changes:

- Added `refresh_token` and `invitation_token` to sensitive key fragments.

### 3) Regression tests added/updated

Updated:

- `MuseBar/backend/src/utils/logger/requestLogger.test.ts`
- `MuseBar/backend/src/utils/clientErrorReporting.test.ts`

Changes:

- Asserted `x-refresh-token` is redacted in request-start logs.
- Added request-body assertions proving `refresh_token` and `invitation_token` are redacted, including nested payloads.
- Extended client-error sanitization assertions for both field names.

## Verification

- `npm run type-check` ✅
- `npm test -- src/utils/logger/requestLogger.test.ts src/utils/clientErrorReporting.test.ts` ✅
- `npm test` ✅

## Notes

- This closes `P3-S14` and keeps token-family fields consistently masked across backend request/error logging paths.
