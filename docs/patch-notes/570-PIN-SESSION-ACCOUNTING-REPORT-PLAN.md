# 570 — PIN session accounting report (PLAN)

## Context

Staff need a printable, informative CA sheet for a PIN badge session (shift end). Fiscal DAILY/WEEKLY/… closures stay unchanged. Session reports are **operational only** (no `legal_journal` `CLOSURE`). PIN close rules (owned open tables) stay unchanged; reports are generated manually.

Fiscal impact: **MINOR**.

## Scope

- Migration `pin_session_reports`
- Aggregator by `orders.pin_session_id`
- API under `/api/pin-sessions/…/reports`
- History UI + browser print
- Tests for aggregator + route permissions

## Approach

1. Append-only `pin_session_reports` with snapshot JSON
2. Preview + persist endpoints (PIN actor + `access_pos`)
3. History panel: date → sessions → Générer / Imprimer
4. Do not gate PIN close on report generation

## Verification

- [ ] `pinSessionReportAggregate.test.ts`
- [ ] `pinSessions.reports.permissions.test.ts` (no PIN → 403)
- [ ] `npm test --workspace MuseBar/backend`
- [ ] Manual: generate + print from History
- [ ] Fiscal impact: MINOR

## Risks

Confusion with fiscal closures — label UI « rapport informatif ».
