# 394 - Step 2 (closure bulletin preview/print flow completion) - Implementation

## What was delivered

Step 2 is implemented for closure bulletin print UX.

Delivered outcomes:

1. Closure bulletins now use a single action button opening one unified operator dialog.
2. Backend now exposes a closure preview endpoint in `/api/printing`.
3. Unified dialog now includes accounting-level detail parity with bulletin breakdown view.
4. Closure print action from the dialog queues printing through existing Epson/printing pipeline.
5. Printed closure payload now includes detailed accounting fields (TVA buckets, HT/TTC, payment breakdown, tips/change, fond de caisse).
6. Export action is available from the same dialog.
7. Success/error operator feedback is integrated with existing snackbar flow.

## Changed files

### Backend

- `MuseBar/backend/src/routes/printing.ts`
  - added `GET /api/printing/closure/:bulletinId/preview`,
  - returns `bulletin_data` without queuing print,
  - includes validation and 404/500 handling consistent with existing printing routes.

- `MuseBar/backend/src/services/printing/eposPrintXml.ts`
  - enriched closure thermal payload with accounting-level detail fields:
    - total TTC / total HT / total TVA,
    - TVA 10% and 20% submitted totals + VAT amounts,
    - total cards / total cash,
    - tips / change / fond de caisse,
    - sequence range and closure hash.

### Frontend

- `MuseBar/src/components/Closure/PrintClosureDialog.tsx` (new)
  - loads closure preview on open (`/printing/closure/:id/preview`),
  - shows full accounting detail preview aligned with bulletin breakdown fields,
  - sends print request (`POST /printing/closure/:id`),
  - provides export action from same dialog,
  - forwards success/error messages to parent snackbar hooks.

- `MuseBar/src/components/Closure/ClosureContainer.tsx`
  - uses one unified bulletin action flow through `PrintClosureDialog`,
  - wires print feedback to closure snackbar (`showSuccess`, `showError`).

- `MuseBar/src/components/Closure/BulletinsTable.tsx`
  - reduced three separate actions (details/print/download) to one action button opening unified dialog.

## Behavior before vs after

### Before

- Closure table had three separate actions (details/print/download) with fragmented operator flow.
- No dedicated closure preview route under `/api/printing`.
- Printed closure payload was too minimal vs accounting breakdown requirements.

### After

- One closure action opens a unified dialog for preview/print/export.
- Operators can validate full accounting detail before print queue action.
- Print action queues closure bulletin print and reports success/failure in UI.
- Printed closure format contains accounting-level details expected from bulletin breakdown.

## Verification evidence

Commands run from repository root:

1. `npm run type-check --workspace MuseBar`
2. `npm run lint --workspace MuseBar`

Both complete successfully for this step (existing unrelated backend warnings remain).

## Remaining scope after Step 2

- Step 3: preview vs thermal payload parity hardening.
- Step 4: dedicated invoice subsystem (true facture lifecycle).
