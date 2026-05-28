# 392 - Step 1 (receipt preview/print flow repair) - Implementation

## What was delivered

Step 1 is now implemented for receipt preview/print flow stabilization across POS and History.

Delivered outcomes:

1. History now mounts and uses the shared receipt preview/print dialog.
2. Receipt dialog now uses receipt-only wording (no invoice labels in this step).
3. Receipt dialog accepts both numeric and numeric-string order IDs safely.
4. Invalid order IDs are blocked with explicit error feedback.
5. Sensitive report exports are prevented from accidental git add through root ignore rules.

## Changed files

### Feature code

- `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx`
  - replaced document-type model with receipt-only modes (`detailed` / `summary`),
  - added `defaultReceiptType` prop for caller-controlled default mode,
  - broadened `orderId` prop to `number | string | null`,
  - added strict numeric-string validation before preview/print API calls,
  - added clear error handling when ID is invalid,
  - retained preview-first flow and print queue call pattern.

- `MuseBar/src/components/History/HistoryContainer.tsx`
  - mounted `PrintAfterSaleDialog`,
  - wired dialog open/close to `useHistoryState` receipt state,
  - passed current order ID and selected receipt type to dialog.

### Repository safety

- `.gitignore`
  - added `docs/reports/` to avoid committing sensitive financial report exports.

### Step planning/doc workflow

- `docs/patch-notes/391-STEP1-RECEIPT-PREVIEW-PRINT-FLOW-REPAIR-PLAN.md`
  - step-level implementation plan created before coding.

## Behavior before vs after

### Before

- History print action updated local state but no print dialog rendered.
- Dialog UI suggested invoice variants despite no dedicated invoice backend.
- Dialog only accepted numeric `orderId`, creating fragile integration with string-typed order IDs.

### After

- History print action opens a functional preview/print dialog.
- Dialog language reflects current implemented scope: receipt modes only.
- Both numeric and numeric-string IDs are accepted; invalid IDs fail fast with visible operator feedback.

## Verification evidence

Commands executed from repository root:

1. `npm run lint --workspace MuseBar`
   - completed successfully for this step (warnings existed in unrelated backend files only; no new errors).
2. `npm run type-check --workspace MuseBar`
   - completed successfully.

## Remaining work (next steps)

- Step 2: closure bulletin preview/print UX completion.
- Step 3: parity hardening between preview renderer and thermal print payload.
- Step 4: dedicated invoice subsystem (true facture lifecycle).
