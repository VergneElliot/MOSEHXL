# 324 — P3-S15 frontend client error logger (plan)

## Objective

Ship a centralized frontend logger that reports runtime/client errors to backend `/api/client-errors` in production (and optionally in development via env toggle).

## Scope

### In scope

- Add a frontend `clientErrorLogger` service responsible for structured error reporting.
- Bootstrap logger initialization at app startup.
- Integrate error-boundary reporting with the centralized logger.
- Add regression tests for report path and console interception behavior.

### Out of scope

- Replacing every existing `console.error` call site manually.
- Changes to backend `/api/client-errors` contract.

## Design decisions

1. Hook `console.error`, `window.error`, and `unhandledrejection` centrally to capture existing and future call paths.
2. Keep reporting fail-safe (never throw from logger path).
3. Support secure production auth header transport via optional `REACT_APP_CLIENT_ERROR_REPORT_KEY`.

## Verification plan

- Frontend type-check.
- Frontend tests:
  - `src/services/clientErrorLogger.test.ts`
  - full frontend test run.
