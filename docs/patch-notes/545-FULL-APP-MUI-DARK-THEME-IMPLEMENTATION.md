# 545 — Full-app MUI dark theme (IMPLEMENTATION)

## Summary

`createAppTheme(mode)` provides light/dark palettes (dark blue-grey surfaces).
`VisualPrefsProvider` wraps a live `ThemeProvider` from the PIN’s `color_mode`
(default dark). Profil → Affichage toggles theme and scale for the active badge.

## Files

- `theme/createAppTheme.ts`
- `index.tsx` boots with dark theme for login
- `App.tsx` nests `VisualPrefsProvider` under `PinSessionsProvider`
- `ProfileDisplaySettings.tsx` + wiring in `ProfileSettings.tsx`

## Fiscal impact

MINOR (UI only).
