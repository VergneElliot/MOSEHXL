# 476 — Unify France date/time display (PLAN)

## Context

Dates and times are formatted inconsistently: some UI uses the OS locale (`datetime-local` → MM/DD/YYYY and AM/PM), backend prints use `toLocaleString('fr-FR')` **without** `Europe/Paris` (kitchen tickets on a UTC host show the wrong hour — observed ~2–3h offset), and several screens omit 24-hour clock options.

The product is France-only. Civil time for humans must be **Europe/Paris** (CET/CEST DST), **DD/MM/YYYY**, and **24-hour** time (`23:00`, not 11 PM).

## Scope

- Shared formatter in `@mosehxl/types` (`datetime.ts`).
- Display surfaces: POS receipts, kitchen tickets, emails, PDFs, XLSX labels, legal journal UI, history, admin (reservations, planning, pointage), public booking/shift confirm.
- Input surfaces: replace native `datetime-local` / locale-dependent `date`/`time` pickers in cashier-facing dialogs with explicit `jj/mm/aaaa` + `HH:mm` fields.
- Convert wall-clock form values to UTC with Paris TZ (not the browser TZ).

## Out of scope (must stay UTC / machine format)

- Legal journal **hash payload** timestamps (`timestamp.toISOString()`).
- API JSON `timestamptz` / ISO 8601 fields.
- ICS `DTSTAMP` / UTC iCalendar.
- Server logs.

## Approach

1. Add `APP_TIMEZONE = Europe/Paris` helpers: format date/time from parts (stable `DD/MM/YYYY HH:mm`), Paris wall-clock ↔ UTC ISO.
2. Use them in kitchen/receipt printers (fixes printed hour).
3. Frontend `formatDate` re-exports shared helpers; new `ParisDateTimeField` / `ParisDateField` / `ParisTimeField`.
4. Tests for winter/summer offset and kitchen ticket string.

## Verification

- [ ] Unit tests: Paris winter UTC+1, summer UTC+2, kitchen ticket hour
- [ ] Reservations / planning dialogs: no AM/PM; date `jj/mm/aaaa`
- [ ] Fiscal impact: PATCH (display only; hash chain unchanged)

## Risks

- Midnight near DST: wall-clock conversion uses Intl offset, not a fixed +1/+2.
- Do not rewrite stored journal timestamps.
