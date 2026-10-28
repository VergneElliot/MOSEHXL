# 573 — In-app notifications framework (IMPLEMENTATION)

## Summary

Establishment-scoped notification feed with per-account reads, header bell + poll, producers for inbound inbox / reservation seed and daily « réservations du jour » digest.

Fiscal impact: **MINOR**.

## Delivered

- Migration `2026_10_28_15_41_00_in_app_notifications.sql`
- `NotificationModel`, `emitInboxNotification`, `ReservationDayNotificationScheduler`
- `GET/POST /api/admin/notifications*`
- `NotificationBell` in `AppHeader`; deep-link via `adminNavigate`

## Tests

- `notifications.emit.test.ts`
- `emitInboxNotification.test.ts`
- `reservationDayDigest.test.ts`
- `notifications.permissions.test.ts`
- `adminNavigate.test.ts`

## Verification

- [x] New tests green
- [x] Fiscal impact: MINOR
