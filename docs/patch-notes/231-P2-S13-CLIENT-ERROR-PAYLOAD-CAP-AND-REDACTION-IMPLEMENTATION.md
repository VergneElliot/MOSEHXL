# 231 - P2-S13 (client error payload cap and log redaction) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/230-P2-S13-CLIENT-ERROR-PAYLOAD-CAP-AND-REDACTION-PLAN.md`

## What was implemented

This patch closes P2-S13 by adding payload-size enforcement and structured
redaction for `/api/client-errors` logging paths.

## 1) Added shared client-error reporting utility

Added:
- `MuseBar/backend/src/utils/clientErrorReporting.ts`

Capabilities:
1. `MAX_CLIENT_ERROR_REPORT_BYTES` constant (`16 KiB`).
2. `getClientErrorPayloadSizeBytes(...)` for stable size calculation.
3. `isClientErrorPayloadTooLarge(...)` for policy checks.
4. `sanitizeClientErrorForLog(...)` to recursively redact sensitive keys
   (`password`, `token`, `secret`, `authorization`, `cookie`, setup/client keys, etc.)
   and truncate long strings.

## 2) Hardened `/api/client-errors` in both env branches

Updated:
- `MuseBar/backend/src/app.ts`

Changes:
1. Development endpoint now:
   - rejects oversized payloads with `413`,
   - logs only sanitized metadata.
2. Production endpoint (when report key is enabled) now applies the same:
   - key check unchanged,
   - oversized payload `413`,
   - sanitized logging only.
3. Log metadata now includes `payload_size_bytes` for diagnostics.

Result:
- endpoint no longer accepts unbounded payloads,
- raw sensitive client payload fields are not logged.

## 3) Added regression tests for utility behavior

Added:
- `MuseBar/backend/src/utils/clientErrorReporting.test.ts`

Coverage:
1. oversized payload detection,
2. under-limit payload acceptance,
3. nested sensitive field redaction behavior.

## Verification

Executed:

1. Targeted tests:
   - `npm run test -- src/utils/clientErrorReporting.test.ts src/utils/logger/requestLogger.test.ts`
   - Result: passed (2 files, 4 tests).
2. Backend type-check:
   - `npm run type-check`
   - Result: passed.
3. Lint diagnostics on touched files:
   - Result: no lint errors.

## Outcome

P2-S13 is complete:
- `/api/client-errors` has an explicit size guard,
- client error logs are sanitized/redacted instead of raw body passthrough,
- regression tests protect the new behavior.
