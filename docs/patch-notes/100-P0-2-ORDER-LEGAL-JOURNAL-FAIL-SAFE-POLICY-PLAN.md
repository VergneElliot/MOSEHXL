# 100 - P0-2 (Order + Legal Journal Fail-Safe Policy) - Plan

Date: 2026-04-28  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After P0-1 fixed SQL arity, the next critical issue remains:

- `POST /api/orders` can still persist a completed sale even if legal journal write fails.
- Current behavior is asynchronous best-effort logging (`.catch(...)`) with success response preserved.

For fiscal compliance posture, we need a fail-safe policy: completed-sale creation must not return success if SALE journal persistence fails.

## Scope

### In scope

1. Harden `POST /api/orders` completed-sale flow:
   - await SALE legal journal write,
   - if journal write fails: return 500 and trigger compensating delete of created order.
2. Add regression tests for the fail-safe path.
3. Keep existing non-completed order behavior unchanged.
4. Document implementation and verification.

### Out of scope

- Full single-transaction rewrite spanning all writes via one DB client.
- Refactor of all route-level error handling (tracked under C2 continuation).

## Design choices

- **Fail-safe now, full transaction later**: apply strict response policy immediately without broad query-layer refactor.
- **Compensating delete**: best effort cleanup to avoid leaving completed sale rows without legal trace.
- **Minimal blast radius**: only completed-sale branch in `orderCRUD` is changed.

## Step-by-step plan

### Step 1 - Route hardening
- In `backend/src/routes/orders/orderCRUD.ts`:
  - replace fire-and-forget `LegalJournalModel.logTransaction(...).catch(...)`
  - with awaited call in try/catch.
- On journal failure:
  - log error,
  - attempt `OrderModel.delete(order.id, establishmentId)` as compensating delete,
  - return 500 compliance error response.

### Step 2 - Regression tests
- Add route test file asserting:
  - completed order + journal failure => HTTP 500 + compensating delete called;
  - pending order => 201 and no sale journal call.

### Step 3 - Verify
- Run targeted backend tests for the new route behavior.
- Run backend type-check.

### Step 4 - Document and ship
- Write implementation patch note with changes and test outputs.
- Commit and push with this patch set.

## Acceptance criteria

- Completed-sale creation no longer returns success when legal journal write fails.
- Compensating delete is attempted on legal journal failure.
- Regression tests cover this policy and pass.
- Docs are updated (plan + implementation).
