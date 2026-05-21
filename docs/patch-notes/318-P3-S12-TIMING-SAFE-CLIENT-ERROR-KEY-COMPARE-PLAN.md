# 318 — P3-S12 timing-safe client-error key compare (plan)

## Objective

Harden production `POST /api/client-errors` auth by replacing direct string comparison with constant-time key verification.

## Scope

### In scope

- Implement a timing-safe comparison helper for client-error report keys.
- Wire production client-error endpoint auth to use the new helper.
- Add regression tests for accepted/rejected key cases.

### Out of scope

- Changing development-mode behavior for `/api/client-errors`.
- Changing payload size/sanitization behavior.

## Design decisions

1. Use `crypto.timingSafeEqual` with strict length checks.
2. Fail closed (`false`) on malformed inputs or conversion errors.
3. Keep existing HTTP behavior unchanged (`403 Forbidden` on auth failure).

## Verification plan

- Backend type-check.
- Targeted tests:
  - `src/utils/clientErrorReporting.test.ts`
