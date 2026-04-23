# 94 - Phase D3 (Epson Poll Key Header) - Plan

Date: 2026-04-23  
Phase: D3 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

Epson Server Direct polling currently passes the poll secret in the URL query string (`key=...`).
Query strings are more likely to leak via reverse-proxy logs, request logs, and shared diagnostics.

D3 moves the secret transport to an HTTP header while preserving short-term compatibility.

## Scope

### In scope

1. Accept poll key from a dedicated header (`x-epson-poll-key`).
2. Keep temporary legacy fallback from query parameter (`key`) for compatibility.
3. Update generated Epson poll setup metadata so URL no longer embeds the key.
4. Add tests for header-first authentication and compatibility fallback behavior.

### Out of scope

- Full removal of query fallback in this same pass.
- Printer fleet rollout automation (operational process remains manual).

## Design choices

- **Header-first priority**: if header is present, use it as source of truth.
- **Compatibility window**: allow `?key=` only when header is absent.
- **Safer setup metadata**: return poll URL without key and explicit header-name guidance.
- **No change to queue logic**: only auth transport is modified.

## Step-by-step plan

### Step 1 - Poll handler update
- In `epsonPollHandler`, read:
  - key from `x-epson-poll-key` header (preferred),
  - fallback from `req.query.key` (legacy compatibility).

### Step 2 - Configuration metadata update
- In `printingConfigRepo`, generate `epson_server_direct_poll_url` without query key.
- Add metadata field for required header name.

### Step 3 - UX/docs string alignment
- Update route/service comments and printer setup copy to mention header transport.

### Step 4 - Tests and verification
- Add unit tests for `epsonPollHandler`:
  - valid header key => success,
  - fallback query key => success (compatibility),
  - missing/invalid key => 403.
- Run backend checks:
  - `npm run type-check`
  - `npm test`

### Step 5 - Documentation
- Add D3 implementation patch note with compatibility details and verification evidence.

## Acceptance criteria

- Epson poll key is header-based by default.
- Legacy query key remains temporarily accepted.
- Generated poll URL no longer contains `key=...`.
- Tests and type-check pass.
- D3 plan + implementation docs recorded.
