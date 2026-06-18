# 325 — P3-S15 frontend client error logger (implementation)

## What changed

### 1) Added centralized frontend client logger service

Added:

- `MuseBar/src/services/clientErrorLogger.ts`

Behavior:

- Reports structured client errors to `/api/client-errors`.
- Uses `apiConfig` for endpoint resolution.
- Sends `credentials: 'include'` and optional `x-client-error-key` from `REACT_APP_CLIENT_ERROR_REPORT_KEY`.
- Captures errors from:
  - `console.error`,
  - `window` `error` events,
  - `window` `unhandledrejection` events.
- Fails silent on reporting errors to avoid recursive failures.

### 2) Bootstrapped logger at app start

Updated:

- `MuseBar/src/index.tsx`

Changes:

- Calls `initializeClientErrorLogging()` during app initialization so existing console/runtime errors are shipped centrally.

### 3) Routed Error Boundary reporting through shared logger

Updated:

- `MuseBar/src/components/common/ErrorBoundary/useErrorHandler.ts`

Changes:

- Replaced direct `fetch('/api/client-errors')` path with `reportClientError(...)` from centralized service.
- Keeps existing severity/context/Sentry behavior intact.

### 4) Added regression tests

Added:

- `MuseBar/src/services/clientErrorLogger.test.ts`

Coverage:

- Verifies explicit report calls post to `/api/client-errors` with expected auth header behavior.
- Verifies `console.error` interception triggers reporting.

## Verification

- `npm run type-check` (frontend) ✅
- `npm test -- src/services/clientErrorLogger.test.ts --watchAll=false` ✅
- `npm test -- --watchAll=false` ✅

## Notes

- This closes `P3-S15` by moving frontend client error reporting from ad-hoc/dev-only behavior to a centralized production-capable pipeline.
