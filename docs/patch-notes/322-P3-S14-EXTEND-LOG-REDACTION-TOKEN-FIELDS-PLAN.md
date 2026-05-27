# 322 — P3-S14 extend log redaction token fields (plan)

## Objective

Extend backend log redaction coverage to explicitly include `refresh_token` and `invitation_token` field names.

## Scope

### In scope

- Extend request logger redaction lists for body/header token variants.
- Extend client-error payload redaction fragments for explicit token field names.
- Add regression tests that assert both fields are redacted.

### Out of scope

- Changing logging transport/format behavior.
- Adding route-specific masking logic.

## Design decisions

1. Keep generic `token` matching and add explicit `refresh_token`/`invitation_token` keys as defense-in-depth.
2. Redact `x-refresh-token` header in request logs.
3. Validate redaction through focused unit tests in logger and client-error sanitizers.

## Verification plan

- Backend type-check.
- Targeted tests:
  - `src/utils/logger/requestLogger.test.ts`
  - `src/utils/clientErrorReporting.test.ts`
