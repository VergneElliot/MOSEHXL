# 568 — Q — Unit test coverage Slice D: FE policies / hooks / mappers (IMPLEMENTATION)

## Summary

Extended MuseBar frontend unit coverage via PIN/session policies, pure cart/payment helpers, API DTO mappers, and one light Testing Library enablement harness — **no full POS/Admin MUI trees**.

**Wave 2 (prep Slice E):** narrowed Vitest `coverage.include` to the business-logic surface (utils / contexts `.ts` / hooks / services / `components/**/*.ts` / i18n / pwa / config — **excluding** UI `.tsx` containers and `utils/testing`). Wired pure-module **≥80%** glob thresholds (Vitest 3 flat keys). Overall CI floor ratcheted to **lines/statements 17%** (measured ~20.4% − 3).

Fiscal impact: **PATCH** — tests only.

## Tests added / extended

### PIN / page-entry / elevation / sessions

| File | Focus |
|------|--------|
| `contexts/pinActorFromVerify.test.ts` | Verify → actor mapping, JWT sid fallback |
| `contexts/stepUpPageEntryPolicy.test.ts` | Extra basic / unknown-key cases |
| `contexts/stepUpElevationPolicy.test.ts` | Empty list + basic hold |
| `contexts/pinSessionsState.test.ts` | `isSessionExpired`, `newSessionId`, focus/dismiss edge, normalize sid rebase |
| `contexts/pinSessionsMerge.test.ts` | Locked cart preserve, email fallback, `dedupeRemoteByUser` |
| `utils/pinSessionPermissions.test.ts` | Admin roles + staff list |
| `Administration/adminSectionAccess.test.ts` | Deny / system_admin / gated-only fallback |
| `Administration/adminSectionEnablement.test.tsx` | Light RTL: disabled vs enabled tabs |

### Cart / payment pure logic

| File | Focus |
|------|--------|
| `hooks/__tests__/usePOSOrderTotals.test.ts` | `saleLines` / tips / `canProcessPayment` |
| `POS/posContainerItems.test.ts` | Product / divers / pourboire line builders |
| `POS/printAfterSaleInvoice.test.ts` | `parseOrderId`, invoice body builder |

### API mappers / floor DTOs

| File | Focus |
|------|--------|
| `services/api/products.mapper.test.ts` | HH discount, options, printers, archived |
| `services/api/categories.mapper.test.ts` | Defaults, archived, update patch |
| `services/api/kitchenPrinters.mapper.test.ts` | Connection config + create payload |
| `services/api/orders.mapper.test.ts` | Waiter/kitchen/options / offert edge |
| `services/api/floorOngoingOrders.test.ts` | List unwrap + fulfillment PIN header |
| `services/api/floorApiHeaders.test.ts` | `pinHeaders` |
| `utils/businessInfoMapper.test.ts` | snake→camel business info |
| `utils/orderItemOptions.test.ts` | Label format + API payload |
| `utils/canUseVirtualization.test.ts` | ResizeObserver gate |

## Wave 2 — coverage.include + pure-module thresholds

Configured in `MuseBar/vite.config.ts`:

**Include (business logic only):**
- `src/utils/**/*.{ts,tsx}`, `src/contexts/**/*.ts`, `src/hooks/**/*.{ts,tsx}`
- `src/services/**/*.{ts,tsx}`, `src/components/**/*.ts`
- `src/i18n/**/*.ts`, `src/pwa/**/*.ts`, `src/config/**/*.ts`

**Exclude:** `*.test.*` / `__tests__`, `src/components/**/*.tsx`, `src/pages/**`, `src/utils/testing/**`

**Overall thresholds:** `lines/statements: 17`, `branches/functions: 60`

**Pure-module glob thresholds (≥80% lines/statements aggregate, not `perFile`):**
- `src/utils/**/*.ts` (brace `{ts,tsx}` keys mis-resolve in Vitest micromatch — use `*.ts`)
- `src/contexts/*Policy.ts`, `pinSessions*.ts`, `pinActorFromVerify.ts`
- `src/**/*Draft*.ts`, `src/**/*Totals*.ts`
- `src/components/POS/PaymentDialog/split*.ts`
- `adminSectionAccess`, `closurePreviewTotals`, `publicReservationHours`
- `floorTicketMappers` (branches floor **65** — measured ~67.7%)
- `usePOSOrderTotals`, `posContainerItems`

## Verification results

```bash
cd MuseBar && npx vitest run \
  src/contexts/pinActorFromVerify.test.ts \
  src/contexts/stepUpPageEntryPolicy.test.ts \
  src/contexts/stepUpElevationPolicy.test.ts \
  src/contexts/pinSessionsState.test.ts \
  src/contexts/pinSessionsMerge.test.ts \
  src/utils/pinSessionPermissions.test.ts \
  src/utils/businessInfoMapper.test.ts \
  src/utils/orderItemOptions.test.ts \
  src/utils/canUseVirtualization.test.ts \
  src/hooks/__tests__/usePOSOrderTotals.test.ts \
  src/components/POS/posContainerItems.test.ts \
  src/components/POS/printAfterSaleInvoice.test.ts \
  src/components/Administration/adminSectionAccess.test.ts \
  src/components/Administration/adminSectionEnablement.test.tsx \
  src/services/api/products.mapper.test.ts \
  src/services/api/categories.mapper.test.ts \
  src/services/api/kitchenPrinters.mapper.test.ts \
  src/services/api/orders.mapper.test.ts \
  src/services/api/floorOngoingOrders.test.ts \
  src/services/api/floorApiHeaders.test.ts

cd MuseBar && npm run test:ci
```

### Wave 1 (policies / mappers)

- Slice D suites: **20** files / **99** tests passed
- Full frontend `test:ci` (wide include): **48** files / **227** tests; **~5.82%** lines; floor **3%**

### Wave 2 (narrow include + more pure modules)

- Full frontend `test:ci`: **67** files / **288** tests passed
- FE coverage (narrow include): **~20.39%** lines (stmts 20.39%, branches 78.13%, funcs 64.04%)
- CI floor: **17%** lines/statements; pure globs **≥80%** (see above)
- `src/utils` aggregate **~84.5%** lines
- Fiscal impact: PATCH

### Wave-2 tests added

| File | Focus |
|------|--------|
| `floor/floorGeometry.test.ts` | snap / clamp / presets / labels |
| `floor/floorSelectDropHit.test.ts` | canvas hit-test / drop threshold |
| `hooks/floorActiveTable.test.ts` | draft status / active table state |
| `hooks/floorMoveTarget.test.ts` | merge vs transfer |
| `hooks/floorPlanTableOps.test.ts` | `buildTableDropPrompt` |
| `hooks/floorTicketAbandon.test.ts` | draft vs validated abandon gates |
| `Administration/timeClockPanelDates.test.ts` | week/month ISO bounds |
| `Administration/TimeClock/timeClockFormat.test.ts` | hours / duration / labels |
| `Administration/Reservations/reservationConstants.test.ts` | status colors / date key |
| `Administration/inboxReservationLabels.test.ts` | status/action label maps |
| `Administration/Planning/planningTypes.test.ts` | staff / shift form helpers |
| `Administration/Planning/planningCalendarItems.test.ts` | calendar item builder |
| `Administration/saveReservationEdit.test.ts` | create/update + email warning |
| `Administration/FloorPlans/floorPlansCanvas.test.ts` | `toCanvasTables` |
| `Legal/LegalReceipt/utils.test.ts` | VAT totals / payment labels |
| `POS/printAfterSalePreview.test.ts` | receipt normalize |
| `POS/posDragGhostChip.test.ts` | drag chip DOM helper |
| `POS/PaymentDialog/splitDnD.test.ts` | drop ids / mime |
| `POS/posTouchDnD.test.ts` (extended) | drop zone / highlight / ignore |
| `services/floorOrderAttribution.test.ts` | station attribution store |

## Caveats

- `adminSectionEnablement.test.tsx` uses a minimal button harness mirroring Admin tab enablement; it does not mount `AdministrationContainer`.
- Product/category/printer mappers are exercised via public API functions with mocked `request` (same pattern as `orders.mapper.test.ts`).
- Wave-2 % is **not** comparable to wave-1’s ~5.8% — denominator dropped UI `.tsx` trees.
- Index regeneration (`docs:patch-notes-index`) left for the integrating commit.

## Follow-ups

Slice E (569): keep filling pure `.ts` gaps (hooks/services API wrappers still dilute toward 40%); raise overall floor with measured−3 margin after each wave.
