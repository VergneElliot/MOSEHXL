# 559 — Nav IA: floor editor, admin order, users & printers (IMPLEMENTATION)

## Summary

Moving-day IA cleanup:

1. **Plan de salle** — sub-tabs Service + « Modifier le plan » (editor left Administration).
2. **Administration** — land on Boîte mail; order: inbox → reservations → planning →
   pointage → documents → compliance → audit. Floor editor and users removed.
3. **Paramètres** — Utilisateurs sub-tab; Imprimante hosts kitchen printers (removed from Menu).

## Files

- `FloorPlanTabContainer.tsx`, `appLazyTabPanels`, `AppRouter`
- `AdministrationContainer.tsx`
- `SettingsTabs` / `SettingsContainer` / `types` (+ `token`)
- `PrinterSettingsPanel.tsx`, `KitchenPrintersPanel.tsx`
- `MenuContainer.tsx` (assignment to products only)
- Skills: `administration-space`, `pos-and-floor-service`

## Fiscal impact

PATCH — navigation / UX only.
