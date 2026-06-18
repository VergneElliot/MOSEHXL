# 334 — P3-Q10 currency format consolidation plan

## Objective

Remove duplicated inline euro formatting in backend receipt/printing output paths and centralize formatting in a shared helper.

## Scope

### In scope

- Add a shared backend currency formatting helper.
- Replace inline `toFixed(2) €` / `toFixed(2) EUR` in:
  - `services/printing/BasePrintingService.ts`
  - `services/receipts/EmailReceiptService.ts`
- Verify no behavioral regression in receipt/closure content generation tests.
- Update audit status for `P3-Q10`.

### Out of scope

- Frontend formatting overhaul (frontend already uses shared `src/utils/formatCurrency.ts` in legal receipt utilities).
- Non-receipt numeric formatting unrelated to currency display.

## Design decisions

1. Introduce `backend/src/utils/formatCurrency.ts` with `formatEuroAmount(amount, label)` for `€` / `EUR`.
2. Keep existing output conventions intact (`space` before symbol/label and `2` decimals).
3. Use helper directly in string templates to remove repeated inline formatting logic.

## Verification plan

- `npm run type-check`
- `npm run test -- src/services/printing/BasePrintingService.receiptLegalMention.test.ts`
- `npm run test`
