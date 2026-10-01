# 540 — Venue login PIN-only actors Slice D (IMPLEMENTATION)

Plan: `536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`

## Delivered

- Opening a PIN session clocks in (`time_entries`); closing clocks out.
- Close blocked with HTTP 409 if the actor still has open floor tickets.
- Self clock-in/out, shared-terminal punch APIs return 410 (`TIME_CLOCK_VIA_PIN_ONLY`).
- Pointage UI is status/history/corrections only; header shows presence chip.
- PIN actor TTL default shifted to **1 day** (override `AUTH_PIN_ACTOR_TTL_DAYS`).

## Fiscal impact

MINOR.
