# P3-Q13 Backend Implementation - Enable `noUncheckedIndexedAccess`

## What was implemented

Enabled backend strict indexed access and fixed all resulting compile errors.

## Changes made

- Enabled `"noUncheckedIndexedAccess": true` in:
  - `MuseBar/backend/tsconfig.json`

- Hardened backend indexed access patterns across routes and services:
  - route params converted to safe parsing (`parseInt(req.params.x ?? '', 10)`)
  - query parsing made explicit for string checks/defaults
  - DB row indexing guarded with optional chaining/fallbacks
  - array index reads guarded where first element may be absent
  - string split/index reads guarded with defaults

- Representative files updated:
  - `src/routes/authRegister.ts`
  - `src/routes/categories.ts`
  - `src/routes/enhancedEstablishments.ts`
  - `src/routes/establishmentAccountCreation/index.ts`
  - `src/routes/legal/archive.ts`
  - `src/routes/orders/orderAudit.ts`
  - `src/routes/orders/orderCRUD.ts`
  - `src/routes/orders/orderLegal.ts`
  - `src/routes/printing.ts`
  - `src/routes/printingCompat.ts`
  - `src/routes/products.ts`
  - `src/routes/setup.ts`
  - `src/routes/userManagement/invitationRoutes.ts`
  - `src/services/establishment/dashboard/DashboardDataService.ts`
  - `src/services/receipts/QRReceiptService.ts`
  - `src/services/setup/setupValidator.ts`
  - `src/services/setup/validator/validationRules.ts`
  - `src/utils/closureScheduler.ts`
  - `src/utils/logger/performanceMonitor.ts`
  - `src/middleware/security/*` and migration helper strictness fixes

## Audit status update

Updated `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`:
- `P3-Q13` moved from **In progress** to **Fixed (2026-05-27)**.

## Verification

- `npm run type-check` (backend): **PASS**
- `ReadLints` on backend scope: **no lint errors reported**

## Result

Backend now compiles cleanly with `noUncheckedIndexedAccess` enabled, completing `P3-Q13` for both frontend and backend.
