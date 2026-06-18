# 393 - Step 2 (closure bulletin preview/print flow completion) - Plan

## Context

Step 1 stabilized receipt preview/print flows.  
Step 2 targets closure bulletin operator UX, where "print" actions exist in the table but the end-to-end dialog flow is incomplete.

Current gaps:

- Closure "Print" action only toggles local state.
- No dedicated closure preview route in `/api/printing`.
- No operator-facing print dialog for closure bulletin preview + print confirmation.

## Goal

Provide a complete closure bulletin print workflow from the Closure tab:

1. open print dialog from bulletin row,
2. fetch preview payload safely,
3. allow explicit print queue action,
4. show success/error feedback with clear operator behavior.

## Scope

### In scope

- Add backend closure preview endpoint in printing routes.
- Implement frontend closure print dialog with preview and print action.
- Wire Closure tab print icon to that dialog flow.
- Keep existing closure details dialog unchanged.

### Out of scope

- Bulletin PDF download/export implementation.
- Auto-print after closure creation.
- Printer provider redesign or queue persistence changes.

## Planned changes

1. Backend (`/api/printing`)
   - Add `GET /closure/:bulletinId/preview` using existing `buildClosureBulletinData`.
2. Frontend
   - Add `PrintClosureDialog` component:
     - preview fetch on open,
     - print action (`POST /printing/closure/:id`),
     - loading/error states,
     - concise closure summary preview.
   - Wire `ClosureContainer` print action to `openPrintDialog`/`closePrintDialog`.
   - Trigger snackbar success/error in closure state flow.
3. Docs
   - Add Step 2 implementation note with before/after and verification evidence.

## Acceptance criteria

- Clicking print on a closure bulletin opens a working preview dialog.
- Preview fetch errors are visible and non-blocking to rest of UI.
- Clicking print queues closure bulletin print via existing backend endpoint.
- Successful print action closes dialog and shows operator success feedback.
- No lint/type errors on touched files.

## Verification plan

1. `npm run type-check --workspace MuseBar`
2. `npm run lint --workspace MuseBar`
3. Manual:
   - Open Closure tab, click Print on a bulletin, confirm preview appears.
   - Print request returns success and snackbar feedback.
   - Error path displays failure message cleanly.
