# 312 — P3-S9 drop Epson poll query-key fallback (plan)

## Objective

Remove legacy `?key=` authentication from Epson Server Direct polling and enforce header-only key transport.

## Scope

### In scope

- Update Epson poll handler to authenticate exclusively via `x-epson-poll-key` header.
- Remove route-level comments that describe query-key compatibility behavior.
- Update handler tests to confirm query fallback is rejected.

### Out of scope

- Changes to Epson XML payload generation/dequeue behavior.
- Changes to printing provider selection logic.

## Design decisions

1. Keep 403 response behavior unchanged for missing/invalid key to avoid leaking auth state.
2. Treat empty header values as invalid key material.
3. Preserve establishment-id validation and tenant-scoped config lookup flow.

## Verification plan

- Backend type-check.
- Targeted tests:
  - `src/printing/epsonPollHandler.test.ts`
  - `src/routes/printing.routes.test.ts`
