# 541 — Venue login PIN-only actors Slice E (IMPLEMENTATION)

Plan: `536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`

## Delivered

- Data backfill migration: staff with PIN (and no admin membership) → `can_login=false`.
- Skill `auth-and-multi-tenancy` updated for venue-login / PIN-only / pointage model.
- CHANGELOG Unreleased MINOR entry.
- No historical clock-ins invented from old 30-day badges.

## Fiscal impact

MINOR.
