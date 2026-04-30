# 253 - P2-Q10 (route pool import decoupling) - Implementation

Date: 2026-05-01  
Related plan: `docs/patch-notes/252-P2-Q10-ROUTE-POOL-IMPORT-DECOUPLING-PLAN.md`

## What changed

## 1) Added dedicated pool access module

Added:
- `MuseBar/backend/src/db/pool.ts`

This file is now the canonical route/domain import surface for `pool`.

## 2) Migrated route-side imports away from `app.ts`

Updated pool imports:
1. `MuseBar/backend/src/routes/authLogin.ts`
2. `MuseBar/backend/src/routes/printing.ts`
3. `MuseBar/backend/src/routes/orders/orderCRUD.ts`
4. `MuseBar/backend/src/routes/enhancedEstablishments.ts`
5. `MuseBar/backend/src/routes/establishmentAccountCreation/index.ts`
6. `MuseBar/backend/src/routes/establishmentAccountCreation/middleware/validateInvitation.ts`
7. `MuseBar/backend/src/routes/userManagement/roles/roleQueries.ts`
8. `MuseBar/backend/src/routes/userManagement/team/teamQueries.ts`

Result: route-side code no longer imports `pool` from `app.ts`.

## Verification

Executed:
1. `npm run type-check` (backend) -> pass
2. `npm run test -- src/routes/authLogin.refreshRotation.test.ts src/routes/legal/legalPermissionGates.test.ts` -> pass (`2` files, `22` tests)
3. Route import audit:
   - no remaining `import { pool } from ...app` under `backend/src/routes`
4. Lint diagnostics on touched files -> no issues

## Result

P2-Q10 route-coupling objective is satisfied: route-layer database access now goes
through a dedicated pool module instead of importing directly from application
bootstrap.
