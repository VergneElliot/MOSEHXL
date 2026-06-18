# 230 - P2-S13 (client error payload cap and log redaction) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S13)

## Why this patch exists

`POST /api/client-errors` currently logs request body data directly and has no
payload-size guard. That creates two risks:

1. unbounded payloads can increase memory/log pressure,
2. sensitive client-side fields can be persisted in server logs.

## Scope

### In scope

1. Add a strict payload-size cap for `/api/client-errors`.
2. Sanitize/redact client-error payload before logging.
3. Apply the same behavior in both development and production endpoint branches.
4. Add focused tests for payload-size and sanitization logic.
5. Document implementation and verification.

### Out of scope

- Reworking frontend error-capture schema.
- Replacing the endpoint with an external error-collection service.

## Design choices

1. **Shared utility for both env paths**
   - Introduce a dedicated utility module used by both dev/prod route handlers.
   - Avoid duplicated logic drift.

2. **Hard cap with explicit status**
   - Reject oversized payloads with `413 Payload Too Large`.
   - Keep success payload unchanged for valid reports.

3. **Deterministic redaction**
   - Recursively sanitize nested objects and redact common sensitive keys
     (`password`, `token`, `secret`, `authorization`, `cookie`, etc.).
   - Keep useful diagnostics (`errorId`, `message`, `stack`, URL context).

## Strategy

### Step 1 - Utility layer

New file:
- `MuseBar/backend/src/utils/clientErrorReporting.ts`

Plan:
1. Define max payload bytes constant.
2. Add payload byte-size estimator and oversized check helper.
3. Add recursive sanitizer for client-error log metadata.

### Step 2 - Endpoint hardening

File:
- `MuseBar/backend/src/app.ts`

Plan:
1. Use shared helper in both dev/prod `/api/client-errors` handlers.
2. Reject oversized payload with `413`.
3. Log only sanitized payload metadata.

### Step 3 - Tests and verification

New file:
- `MuseBar/backend/src/utils/clientErrorReporting.test.ts`

Plan:
1. Verify oversized payload detection behavior.
2. Verify sensitive nested fields are redacted.
3. Run targeted test + backend type-check + lint diagnostics.

## Acceptance criteria

1. `/api/client-errors` rejects oversized body with `413`.
2. Logged payload metadata is sanitized/redacted (no raw secret fields).
3. Helper tests pass and backend type-check remains green.
