# 313 — P3-S9 drop Epson poll query-key fallback (implementation)

## What changed

### 1) Enforced header-only Epson poll key auth

Updated:

- `MuseBar/backend/src/printing/epsonPollHandler.ts`

Changes:

- Removed `req.query.key` fallback usage.
- Poll auth now accepts key material only from `x-epson-poll-key`.
- Keeps existing `403 Forbidden` response for invalid/missing key.

### 2) Removed outdated route comment

Updated:

- `MuseBar/backend/src/routes/printing.ts`

Removed legacy compatibility wording that claimed `?key=` fallback support.

### 3) Updated tests for hardened behavior

Updated:

- `MuseBar/backend/src/printing/epsonPollHandler.test.ts`

Changes:

- Replaced legacy fallback acceptance case with rejection expectation.
- Added explicit case for empty header key rejection.

## Verification

- `npm run type-check` ✅
- `npm test -- src/printing/epsonPollHandler.test.ts src/routes/printing.routes.test.ts` ✅

## Notes

- This closes `P3-S9` by removing URL/query token transport for Epson polling and keeping key auth in headers only.
