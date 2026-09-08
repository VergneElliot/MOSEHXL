# 481 — User profile + establishment calendar color (IMPLEMENTATION)

## Summary

Added Settings → **Profil** (optional name, birthday, phone; required unique calendar color) and wired person colors into planning. New accounts get an auto-assigned unique color per establishment membership.

## Schema

- `users.phone`, `users.date_of_birth`
- `user_establishment_memberships.calendar_color` NOT NULL + unique index per active membership in an establishment
- Migration `2026_09_03_17_20_20_add_user_profile_and_calendar_color.sql` (backfill + collide resolve)

## API

- `GET/PATCH /api/auth/me/profile`
- `GET /api/auth/me` includes phone, date_of_birth, calendar_color
- Planning staff list includes `calendar_color`
- Membership create paths call `ensureCalendarColor`

## Frontend

- `ProfileSettings.tsx` — palette picker (used colors disabled)
- Planning month + week grid use staff color (pending stays orange)

## Verification

- [x] migration migrate
- [x] `calendarColors.test.ts`
- [x] sessionRoutes test updated
- [x] frontend + backend tsc

## Fiscal impact

**MINOR** — profile / planning UX only.
