# 343 — P3-Q12 POS/closure/establishment typing implementation

## What changed

### 1) POS payment flow callback typing no longer uses `any`

Updated:

- `MuseBar/src/hooks/usePOSAPI.ts`
- `MuseBar/src/components/POS/POSContainer.tsx`
- `MuseBar/src/components/POS/PaymentDialog/types.ts`
- `MuseBar/src/components/POS/PaymentDialog/usePaymentLogic.ts`
- `MuseBar/src/components/POS/PaymentDialog/hooks/usePaymentProcessing.ts`

Changes:

- Replaced `any` order payloads with domain `Order` type in success callbacks.
- Typed `createOrder` return as `Promise<Order>`.
- Typed `processChange` response with a small typed metadata object instead of `any`.

### 2) Closure API hook cast cleanup

Updated:

- `MuseBar/src/hooks/useClosureAPI.ts`
- `MuseBar/src/services/api/legal.ts`
- `MuseBar/src/services/apiService.ts`

Changes:

- Removed `as any` reads for closure bulletin payload extraction.
- Typed legal API methods for monthly closure bulletin and live monthly stats.
- Removed forced `LiveMonthlyStats` cast and use `null` on monthly-stats load failure.

### 3) Establishment service adapter typing cleanup

Updated:

- `MuseBar/src/services/establishmentService.ts`

Changes:

- Replaced `Promise<any>` and `filters/options: any` with explicit typed interfaces and `Record<string, unknown>` metadata maps.
- Introduced reusable `EstablishmentSearchFilters` and typed response wrappers.

### 4) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Expanded `P3-Q12` progress note to include this POS/closure/establishment typing tranche.

## Verification

- `npm run type-check` (frontend) ✅
- `npx eslint` on touched files ✅

## Notes

- This tranche removes another concentrated set of high-impact `any` usages from frontend runtime-critical adapters while preserving existing behavior.
- Broader `P3-Q12` cleanup is still pending in generic/shared UI type helpers and other legacy edges.
