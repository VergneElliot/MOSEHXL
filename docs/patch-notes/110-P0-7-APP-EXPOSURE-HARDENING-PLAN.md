# 110 - P0-7 (App Exposure Hardening: CORS + Docs + Client Error Ingestion) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

The latest audit still flagged application-surface hardening gaps in `app.ts`:

- broad CORS behavior for production exposure,
- `/api/docs` mounted unconditionally despite `swaggerEnabled` config,
- `/api/client-errors` unauthenticated in all environments.

This patch addresses those surfaces with fail-closed defaults.

## Scope

### In scope

1. Make CORS origin policy environment-aware and explicit:
   - development keeps localhost/LAN convenience,
   - production is restricted to configured `CORS_ORIGIN` allow-list.
2. Gate Swagger route using `config.features.swaggerEnabled`.
3. Harden `/api/client-errors`:
   - development remains open for DX,
   - production requires `x-client-error-key` header matching `CLIENT_ERROR_REPORT_KEY`,
   - fail closed when key is missing.
4. Disable Express `x-powered-by` header.
5. Document and verify via backend type-check.

### Out of scope

- Full A5 host-level hardening (firewall, bind address, SSH policy).
- Frontend wiring for authenticated/error-keyed reporting flows.

## Design choices

- **Fail closed in production**:
  - if origin is not allow-listed, deny CORS,
  - if docs feature disabled, route is not mounted,
  - if client error key is absent, endpoint disabled.
- **Keep development ergonomics**:
  - preserve LAN regex origins for local POS/device workflows in dev only.
- **No auth middleware dependency for client-error endpoint hardening**:
  - avoid adding cross-import cycles in `app.ts`.

## Step-by-step plan

### Step 1 - CORS hardening
- Replace static CORS array in `app.ts` with origin callback:
  - no-origin requests allowed,
  - dev allow-list = localhost + LAN regex + configured origins,
  - prod allow-list = configured origins only.

### Step 2 - Swagger gating
- Mount `/api/docs` only when `config.features.swaggerEnabled` is true.

### Step 3 - Client-errors endpoint hardening
- Keep endpoint in development.
- In production:
  - require `CLIENT_ERROR_REPORT_KEY` env var,
  - require matching `x-client-error-key` request header.
- If key not configured in production, disable endpoint.

### Step 4 - Header hygiene
- Add `app.disable('x-powered-by')`.

### Step 5 - Verify and document
- Run backend type-check.
- Add implementation patch note with behavior summary.

## Acceptance criteria

- Production CORS no longer accepts LAN wildcard origins.
- `/api/docs` respects `swaggerEnabled`.
- `/api/client-errors` is no longer open in production.
- `x-powered-by` header is disabled.
- Backend type-check passes.
