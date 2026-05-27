# 335 — P3-Q10 currency format consolidation implementation

## What changed

### 1) Added shared backend currency formatter

Added:

- `MuseBar/backend/src/utils/formatCurrency.ts`

Details:

- Introduced `formatEuroAmount(amount, label)` helper for standardized `2`-decimal euro display.
- Supports both `€` and `EUR` output labels to match existing receipt/closure content contexts.

### 2) Replaced inline currency formatting in backend receipt/printing services

Updated:

- `MuseBar/backend/src/services/printing/BasePrintingService.ts`
- `MuseBar/backend/src/services/receipts/EmailReceiptService.ts`

Details:

- Replaced repeated inline `toFixed(2)` euro expressions with `formatEuroAmount(...)`.
- Covered line items, totals, VAT blocks, tips/change, and payment breakdown sections.
- Preserved existing output structure and labels while removing duplicated formatting logic.

### 3) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Details:

- Marked `P3-Q10` as fixed.
- Noted that frontend legal receipt utilities already rely on shared frontend formatter.

## Verification

- `npm run type-check` ✅
- `npm run test -- src/services/printing/BasePrintingService.receiptLegalMention.test.ts` ✅
- `npm run test` ✅

## Notes

- This pass centralizes backend receipt/printing currency display while keeping existing user-facing formatting conventions stable.
