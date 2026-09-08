# 477 — Unify France date/time display (IMPLEMENTATION)

## Summary

Unified human-facing date/time across MuseBar on **Europe/Paris** (DST-aware), **DD/MM/YYYY**, and **24-hour** clocks. Kitchen tickets and other server prints no longer depend on the host OS timezone (fixes the printed hour offset). Native `datetime-local` / locale-dependent date/time pickers in admin dialogs were replaced with explicit French text fields.

## What stayed UTC

- Legal journal hash payload timestamps (`toISOString()`)
- API / DB `timestamptz` ISO values
- ICS feeds
- Server logs

## Files changed (high level)

- `MuseBar/packages/types/src/datetime.ts` — shared Paris formatters + wall-clock ↔ UTC
- Frontend `formatDate.ts` re-exports; `ParisDateTimeField` / `ParisDateField` / `ParisTimeField`
- Kitchen / receipt / email / PDF / XLSX / Flux 10.3 display paths
- Reservations, planning, pointage, happy hour, closures, documents, public booking

## Verification results

- [x] `npm test --workspace MuseBar -- --run src/utils/formatDate.test.ts` — pass
- [x] kitchen ticket renderer + flux103 tests — pass
- [x] MuseBar + backend `tsc --noEmit` — pass
- [ ] Browser UI: no browser automation tools in this session — manual check recommended on Administration → Réservations / Planning dialogs

## Fiscal impact

**PATCH** — display/formatting only; hash chain and journal append payload unchanged.

## Follow-ups

- Manual smoke: create a reservation at 23:00, confirm list/email show `23:00` and kitchen test print matches Paris clock.
- Optional: migrate remaining number `toLocaleString` usages are fine (not dates).
