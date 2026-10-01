# 539 — Venue login PIN-only actors Slice C (IMPLEMENTATION)

Plan: `536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`

## Delivered

- `POST /api/auth/switch-establishment` requires `owner_pin` verified against the login
  user's membership PIN on the **target** establishment.
- AppHeader prompts for that PIN before switching venues.

## Fiscal impact

MINOR.
