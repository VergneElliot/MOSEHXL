# 89 - Code Hygiene C5 (Testing and CI Realism) - Implementation

Date: 2026-04-23  
Status: **Implemented**  
Plan reference: `docs/patch-notes/88-CODE-HYGIENE-C5-TESTING-PLAN.md`.

## 1) C5 item-by-item status

### 1.1 Backend test command realism

Audit requirement:
- remove stub `"test"` command or add a real test setup.

Result:
- Already satisfied before this patch.
- `MuseBar/backend/package.json` uses:
  - `"test": "vitest run"`

No change required for this item.

### 1.2 CI npm audit gate

Audit requirement:
- fail on high-severity findings.

Change applied:
- Updated `.github/workflows/ci-cd.yml`:
  - frontend audit: `npm audit --audit-level=high`
  - backend audit: `npm audit --audit-level=high`

This aligns workflow behavior to explicit C5 wording.

### 1.3 Tenant-isolation orders test

Audit requirement:
- add a test that writes 100 orders across 3 establishments and asserts `GET /api/orders` returns exactly caller-establishment orders.

Change applied:
- Added:
  - `MuseBar/backend/src/routes/orders/orderCRUD.establishmentIsolation.test.ts`

Test behavior:
- Builds an in-memory dataset of 100 orders distributed across 3 establishments.
- Calls `GET /orders` with a JWT scoped to one establishment.
- Asserts:
  - response is 200,
  - response size equals expected count for that establishment,
  - every returned order belongs to caller establishment,
  - route model call is scoped with the caller establishment id.

## 2) Verification

Executed in `MuseBar/backend`:

- `npm run type-check` ✅
- `npm test` ✅ (`7` files, `18` tests)

Additional checks:

- CI workflow now contains `npm audit --audit-level=high` for both frontend and backend audit steps ✅
- Lint diagnostics on the new test file ✅

## 3) Outcome

C5 requirements are now materially covered:

- real backend test command (already in place),
- high-severity npm audit gate in CI,
- explicit tenant-isolation test for `/api/orders`.
