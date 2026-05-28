# 391 - Step 1 (receipt preview/print flow repair) - Plan

## Context

Step 1 from the feature roadmap focuses on making receipt preview/print usable in day-to-day operations before tackling closure bulletin UX and true invoice support.

Current blockers:

- History print action sets receipt state but does not render any dialog.
- Receipt dialog exposes invoice labels that are not backed by a real invoice subsystem.
- Receipt dialog only accepts numeric `orderId` shape, while some frontend order contexts are string-typed.

## Goal

Ship a deterministic, operator-usable receipt preview/print flow across POS and History while avoiding legal/product ambiguity around invoices.

## Scope

### In scope

1. Mount a working receipt preview/print dialog in History.
2. Reuse existing print backend endpoint (`/printing/receipt/:orderId`) for History path.
3. Update receipt dialog UI labels so unsupported invoice semantics are not implied.
4. Harden dialog input typing so both numeric and numeric-string order IDs are handled safely.
5. Add/adjust user-facing error state for invalid order identifiers.

### Out of scope

- True invoice (facture) generation, numbering, PDF export, and email pipeline.
- Closure bulletin preview/print UX.
- Epson queue persistence and backend print provider redesign.

## Planned changes

1. Update `PrintAfterSaleDialog`:
   - accept `orderId` as `number | string | null`,
   - normalize to a validated numeric ID before API calls,
   - switch document selector labels to receipt-only wording,
   - keep detailed/summary receipt modes.
2. Update `HistoryContainer`:
   - mount `PrintAfterSaleDialog`,
   - bind it to `useHistoryState` receipt dialog state,
   - pass selected receipt type from history state.
3. Keep POS integration intact by preserving existing props compatibility.
4. Add a top-level repository ignore rule for `docs/reports/` to prevent sensitive financial reports from being committed.

## Acceptance criteria

- Clicking print in History opens a functional receipt preview dialog.
- History preview can queue receipt printing through the existing backend route.
- Receipt dialog no longer presents “invoice” as if legally implemented.
- Invalid or missing order ID blocks print request with explicit feedback.
- No lint/type regressions on touched frontend files.

## Verification plan

1. Static checks:
   - frontend lint/type-check for touched modules.
2. Manual checks:
   - POS: complete payment -> open dialog -> preview loads -> print queues.
   - History: click print on an order -> dialog opens -> preview loads -> print queues.
   - History invalid ID guard path (if encountered) displays actionable error.

## Deliverables for Step 1

1. This plan document.
2. Code changes for POS/History preview-print repair.
3. Step 1 implementation document summarizing what landed and what remains for Step 2+.
