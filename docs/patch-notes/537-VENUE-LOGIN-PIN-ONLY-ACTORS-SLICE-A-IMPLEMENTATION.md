# 537 — Venue login PIN-only actors Slice A (IMPLEMENTATION)

Plan: `536-VENUE-LOGIN-PIN-ONLY-ACTORS-PLAN.md`

## Delivered

- Migration `users.can_login` (default true).
- Login rejects `can_login = false` (PIN-only staff).
- `requirePermission` / `requireAnyPermission` / `requireEstablishmentAdminOrPermission`
  authorize **PIN actor only** (JWT account never enough).
- Every POS order requires PIN (`requirePosPinActorForTableOrders` → `requirePosPinActor`).
- AppRouter PIN-first shell: no tabs until an active PIN session.

## Fiscal impact

MINOR.
