# 221 - P1-Q8 (Order wire DTO vs view-model boundary) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/220-P1-Q8-ORDER-WIRE-DTO-VIEWMODEL-BOUNDARY-PLAN.md`

## What was implemented

This patch closes P1-Q8 by explicitly documenting the Order data-shape boundary
and adding mapper-focused regression tests.

## 1) Architecture documentation update

Updated:
- `docs/course/02-ARCHITECTURE.md`

Changes:
1. Added dedicated section: **Order DTO Boundary (Wire vs View Model)**.
2. Documented where mapping responsibility lives:
   - `MuseBar/src/services/api/orders.ts` (`mapRawOrder`, `mapRawItem`)
3. Added explicit field mapping examples (`snake_case` -> `camelCase`), including:
   - `total_amount -> totalAmount`
   - `tax_rate` percent -> ratio conversion (`20 -> 0.2`)
   - `sub_bills -> subBills`
4. Added boundary ownership rules:
   - UI consumes view-model types only,
   - API layer owns all naming/shape conversion.

Result:
- wire contract vs view-model boundary is now explicit for maintainers.

## 2) Mapper regression test coverage

New:
- `MuseBar/src/services/api/orders.mapper.test.ts`

Coverage:
1. Validates `getOrders()` maps wire DTO payload into frontend `Order` shape:
   - id/date/amount coercions,
   - item mapping and tax-rate conversion,
   - sub-bill mapping and typing.
2. Validates `getOrdersPaginated()` supports both:
   - legacy array response shape,
   - paginated `{ orders, total }` shape.

Implementation detail:
- tests mock `request` from `services/api/core` to isolate mapping logic.

## Verification

Executed:

1. `npm run test -- --watch=false --runTestsByPath src/services/api/orders.mapper.test.ts`
   - Result: 1 file passed, 2 tests passed.

2. `npm run type-check` (frontend workspace `MuseBar/`)
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-Q8 is complete:
- the Order DTO/view-model boundary is documented in architecture docs,
- mapper behavior is protected by focused regression tests,
- future payload changes now have a clear update path and test guardrail.
