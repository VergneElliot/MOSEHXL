# 319 — P3-S12 timing-safe client-error key compare (implementation)

## What changed

### 1) Added timing-safe key verification utility

Updated:

- `MuseBar/backend/src/utils/clientErrorReporting.ts`

Changes:

- Added `verifyClientErrorReportKey(provided, expected)`:
  - rejects empty inputs,
  - enforces equal-length buffers,
  - uses `crypto.timingSafeEqual` for constant-time comparison,
  - fails closed on errors.

### 2) Wired production endpoint to timing-safe compare

Updated:

- `MuseBar/backend/src/app.ts`

Changes:

- Production `/api/client-errors` auth now uses `verifyClientErrorReportKey` instead of direct string equality.
- Response behavior remains unchanged (`403 Forbidden` on invalid key).

### 3) Added regression coverage

Updated:

- `MuseBar/backend/src/utils/clientErrorReporting.test.ts`

Changes:

- Added test for matching key acceptance.
- Added test for non-matching, wrong-length, and empty input rejection.

## Verification

- `npm run type-check` ✅
- `npm test -- src/utils/clientErrorReporting.test.ts` ✅
- `npm test` ✅

## Notes

- This closes `P3-S12` while keeping the endpoint contract stable.
