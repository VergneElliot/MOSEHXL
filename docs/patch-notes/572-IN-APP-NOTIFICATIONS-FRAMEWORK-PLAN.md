# 572 — In-app notifications framework (PLAN)

## Context

No global in-app alert channel today. Staff need a header bell for new inbox mail (incl. reservation requests) and a daily “réservations du jour” reminder. Framework first; more producers later.

Fiscal impact: **MINOR**.

## Scope

- Tables `notifications`, `notification_reads`, `notification_emissions`
- Admin list / unread-count / mark-read APIs
- Header bell + poll (`useVisibleInterval`)
- Producers: inbound email + reservation inbox seed; daily reservation cron

## Approach

1. Establishment-scoped feed; per-account read state; audience by permission
2. Emit on write from inbound/seed; cron for day digest with dedupe keys
3. Bell in `AppHeader`; deep-link Admin inbox / reservations
4. No WebSocket / Web Push in v1

## Verification

- [ ] `notifications.emit.test.ts`, feed filter / unread-count tests
- [ ] Route permissions / audience filter tests
- [ ] Producer unit tests (mocked)
- [ ] `npm test --workspace MuseBar/backend` + FE tests for bell helpers
- [ ] Fiscal impact: MINOR

## Risks

Noise if poll too aggressive — default ~45–60s when tab visible.
