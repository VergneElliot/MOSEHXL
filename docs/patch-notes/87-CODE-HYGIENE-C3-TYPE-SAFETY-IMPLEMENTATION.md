# 87 - Code Hygiene C3 (Type Safety) - Implementation

Date: 2026-04-23  
Status: **Implemented**  
Plan reference: `docs/patch-notes/86-CODE-HYGIENE-C3-TYPE-SAFETY-PLAN.md`.

## 1) Frontend `any` hardening completed

### `MuseBar/src/services/api/orders.ts`

- Replaced `request<any>`/`request<any[]>` with typed raw interfaces (`RawOrder`, `RawOrderItem`, `RawSubBill`).
- Added typed normalization helpers:
  - `toNumber(...)`
  - `mapRawItem(...)`
  - `mapRawOrder(...)`
- Removed explicit `any` usages in order/item/sub-bill mapping code.

### `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx`

- Replaced `any` preview payload typing with `unknown` + narrowing in `normalizeReceiptForPreview(...)`.
- Replaced `preview` state `any` with `PreviewReceiptOrder` (aligned with legal receipt order type).
- Typed normalized items as `ReceiptItem[]`.
- Replaced preview request payload `any` with `unknown`.

### `MuseBar/src/components/PrinterSetup/PrinterSetup.tsx`

- Replaced configuration `any` types with `Record<string, unknown>`.
- Added typed response interfaces for printing endpoints:
  - `PrintingConfigurationsResponse`
  - `PrintingTestResponse`
  - `PrintersResponse`
- Removed explicit `any` from config handlers and active configuration lookup.

## 2) Backend JSON parse failure logging added

### `MuseBar/backend/src/printing/printingConfigRepo.ts`
- Added parse-failure logging around `JSON.parse(...)` in `parseConfigCell(...)`.
- Preserved `{}` fallback behavior.

### `MuseBar/backend/src/models/happyHourSettings.ts`
- Added parse-failure logging in `getHappyHourSettings(...)`.
- Preserved default fallback behavior.

### `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
- Added parse-failure logging in `parseJsonField(...)`.
- Preserved passed fallback behavior.

### `MuseBar/backend/src/services/receipts/QRReceiptService.ts`
- Added warning log when JSON parsing fails in `parseQRCodeData(...)` before URL fallback parsing.

Implementation detail:
- Parse logging uses safe logger wrappers that fall back to `process.stderr` if logger bootstrap is unavailable, so parser-failure handling cannot introduce new runtime exceptions.

## 3) Verification

Executed:

- Frontend: `npm run type-check` in `MuseBar` ✅
- Backend: `npm run type-check` in `MuseBar/backend` ✅
- Backend: `npm test` in `MuseBar/backend` ✅ (`6` files, `17` tests)
- Lint diagnostics on all touched files ✅

## 4) C3 scope closure for this pass

This pass completes the exact C3 target list from the audit item:

- frontend `any` cleanup in `orders.ts`, `PrintAfterSaleDialog`, `PrinterSetup`,
- parse-failure logging in `printingConfigRepo`, `happyHourSettings`, `journalQueries`, `QRReceiptService`.
