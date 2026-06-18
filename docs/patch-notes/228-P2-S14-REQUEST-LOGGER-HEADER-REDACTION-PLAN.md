# 228 - P2-S14 (request logger header redaction hardening) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S14)

## Why this patch exists

`RequestLogger.sanitizeHeaders(...)` already redacts common sensitive headers
(`authorization`, `cookie`, tokens), but two security-sensitive headers were
missing from the redaction list:

- `x-setup-secret`
- `x-client-error-key`

Both can carry privileged secrets and should never appear in logs.

## Scope

### In scope

1. Add missing headers to request logger redaction list.
2. Add regression test proving those headers are redacted in request logs.
3. Verify with targeted tests, type-check, and lint diagnostics.

### Out of scope

- Broad logging policy redesign.
- Changes to non-header payload redaction rules.

## Design choices

1. **Minimal targeted fix**
   - Extend existing redaction list; no behavior change for non-sensitive headers.

2. **Behavioral test via middleware**
   - Test through `createMiddleware(...)` logging payload, not by asserting private
     implementation details only.

3. **Preserve current logging shape**
   - Keep same log metadata fields; only redact newly listed headers.

## Strategy

### Step 1 - Redaction list update

File:
- `MuseBar/backend/src/utils/logger/requestLogger.ts`

Plan:
1. Add `x-setup-secret` and `x-client-error-key` to `sensitiveHeaders`.

### Step 2 - Regression test

File:
- `MuseBar/backend/src/utils/logger/requestLogger.test.ts` (new)

Plan:
1. Build minimal request/response objects and invoke middleware.
2. Assert logged headers redact:
   - `authorization`,
   - `x-setup-secret`,
   - `x-client-error-key`.

### Step 3 - Verify

Run:
- targeted vitest for request logger,
- backend type-check,
- lint diagnostics for touched files.

## Acceptance criteria

1. Request logs never contain raw `x-setup-secret` or `x-client-error-key`.
2. Existing redactions still work.
3. Targeted regression test passes.
