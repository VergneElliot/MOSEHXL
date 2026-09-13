# 517 — Comptoir without PIN + Z attribution (IMPLEMENTATION)

## Summary

Comptoir sales work without a PIN session (account login). With a PIN badge they
credit that waiter’s Z; without PIN they go to **Total comptoir**. Table sales still
require PIN. CA report groups by `waiter_user_id` (not `table_label`).

## Files changed

- `requirePosPinActorForTableOrders.ts`, `resolveOrderSalesAttribution.ts` (+ test)
- `orderCRUD.ts`, `orderWaiterDayReport.ts`
- `usePOSAPI.ts`, `floorOrderAttribution.ts`, `useTableInterventionGate.ts`
- `POSContainer.tsx` (comptoir add/checkout without PIN)
- `WaiterDayReportPanel.tsx` copy

## Verification

- [x] module-size / attribution unit test / type-check
- [ ] Manual: no-PIN comptoir sale → Total comptoir; PIN comptoir → waiter Z;
      table still asks for PIN
