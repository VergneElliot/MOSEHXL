# 392 - Step 1 (receipt preview/print flow repair) - Implementation

## What was delivered

Step 1 is now implemented for receipt preview/print flow stabilization across POS and History.

Delivered outcomes:

1. History now mounts and uses the shared receipt preview/print dialog.
2. Receipt dialog now uses receipt-only wording and a single detailed receipt mode.
3. Receipt dialog accepts both numeric and numeric-string order IDs safely.
4. Invalid order IDs are blocked with explicit error feedback.
5. Receipt preview backend now sources legal/business identity from `business_settings` (settings tab source of truth) with safe establishment fallback and SQL aggregation-safe selection.
6. Dialog timeout behavior is context-specific:
   - POS finalize flow keeps auto-close timeout.
   - History flow keeps dialog open until manual close.
7. Sensitive report exports are prevented from accidental git add through root ignore rules.

## Changed files

### Feature code

- `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx`
  - removed invoice wording and receipt mode toggle for now (single detailed receipt),
  - broadened `orderId` prop to `number | string | null`,
  - added strict numeric-string validation before preview/print API calls,
  - added clear error handling when ID is invalid,
  - added `autoCloseEnabled` to support POS timeout but History manual-close behavior,
  - retained preview-first flow and print queue call pattern.

- `MuseBar/src/components/History/HistoryContainer.tsx`
  - mounted `PrintAfterSaleDialog`,
  - wired dialog open/close to `useHistoryState` receipt state,
  - passed current order ID to dialog,
  - disabled dialog auto-close timeout from History (`autoCloseEnabled={false}`).

- `MuseBar/src/components/History/OrdersTable.tsx`
  - simplified receipt print action to one receipt mode (no detailed/summary split in history action signature).

- `MuseBar/src/hooks/useHistoryState.ts`
  - removed receipt type state and action plumbing no longer needed for current single-mode receipt behavior.

- `MuseBar/backend/src/printing/printDataRepo.ts`
  - removed direct reliance on nonexistent `establishments.siret` / `establishments.tax_identification`,
  - sourced legal identity fields from `business_settings` via lateral join,
  - kept fallback for common identity fields from `establishments`,
  - made grouped receipt query aggregation-safe for business fields.

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
- Dialog reflects current implemented scope: single detailed receipt only.
- Both numeric and numeric-string IDs are accepted; invalid IDs fail fast with visible operator feedback.
- Preview backend no longer crashes on establishment legal fields and reads legal identity from settings-backed source.
- POS keeps timeout behavior; History no longer auto-closes the print/preview dialog.

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
