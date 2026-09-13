# 503 — Business-info upsert + setup invite URL (IMPLEMENTATION)

## Changes

- Migration `2026_09_09_14_40_00_business_settings_establishment_unique.sql`
  (partial index — insufficient for bare `ON CONFLICT`)
- Migration `2026_09_09_14_50_00_business_settings_establishment_unique_constraint.sql`
  (full `UNIQUE (establishment_id)` + `NOT NULL`)
- `resolveFrontendBaseUrl()` used by establishment invitation / setup emails
- Production: `FRONTEND_URL=https://mosehxl.com`; Spore invite resent to
  `remi.gouiffes.pro@gmail.com`

## Verification

- `ON CONFLICT (establishment_id)` upsert succeeds on prod
- Invite link host is `mosehxl.com` (not localhost)
- `GET /api/establishment-account-creation/validate/:token` stays 200 for pending Spore invite
