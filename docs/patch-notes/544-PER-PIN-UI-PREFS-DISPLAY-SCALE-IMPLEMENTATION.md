# 544 — Per-PIN ui_prefs + live display scale (IMPLEMENTATION)

## Summary

Memberships store `ui_prefs` JSONB (`scale_percent`, `color_mode`). Profile
GET/PATCH expose them for the active PIN actor. `VisualPrefsProvider` loads on
session change, applies html font-size for zoom, and the header slider persists
with debounce.

## Files

- Migration `2026_10_01_13_11_05_membership_ui_prefs.sql`
- `multi-tenant-schema.sql` snapshot aligned
- `services/auth/uiPrefs.ts` (+ test)
- `MembershipModel.setUiPrefs` / `get` includes `ui_prefs`
- `profileRoutes.ts` returns/patches `ui_prefs`
- Frontend: `utils/uiPrefs.ts`, `VisualPrefsContext`, `DisplayScaleControl`

## Fiscal impact

MINOR (UI prefs only).
