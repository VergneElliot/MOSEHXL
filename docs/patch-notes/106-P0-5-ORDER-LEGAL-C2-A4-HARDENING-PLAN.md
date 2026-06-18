# 106 - P0-5 (orderLegal C2 + A4 Hardening) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

`orderLegal.ts` still has two open issues from the audit backlog:

1. **C2 consistency gap**: local try/catch response handling instead of unified `asyncHandler + AppError`.
2. **A4 permission gap**: legal/compliance read endpoints still rely on `requireAuth` only.

This patch closes both for the `orders/legal` route family.

## Scope

### In scope

1. Migrate `orderLegal.ts` handlers to `asyncHandler`.
2. Replace local catch+500 responses with logger + `AppError` propagation.
3. Add explicit permission gating on legal GET endpoints.
4. Add/update route tests where needed.
5. Document implementation and verification.

### Out of scope

- Full legal router hardening outside `orders/legal/*` (handled in subsequent patches).
- Broad role/permission redesign.

## Design choices

- Preserve existing functional behavior and response payloads for successful flows.
- Keep write route (`POST /journal-entry`) with `requireEstablishmentAdmin`.
- Add explicit legal-read permission requirement via canonical permission registry.

## Step-by-step plan

### Step 1 - Permission registry and route hardening
- Ensure legal-read permission constant exists in `permissions/registry.ts`.
- Apply `requirePermission(...)` to:
  - `GET /api/orders/legal/compliance/:orderId`
  - `GET /api/orders/legal/journal/:orderId`

### Step 2 - Error-handling consolidation
- Convert `orderLegal.ts` handlers to `asyncHandler`.
- Replace local catch response blocks with:
  - `logger.error(...)` context
  - `throw new AppError(...)`

### Step 3 - Verification
- Run targeted tests including `orderLegal.journalEntry.test.ts`.
- Run backend type-check.

### Step 4 - Documentation
- Add implementation patch note with files changed and verification output.

## Acceptance criteria

- `orderLegal.ts` no longer uses local catch-return 500 handling.
- Legal GET endpoints are no longer `requireAuth` only.
- Tests pass.
- Backend type-check passes.
