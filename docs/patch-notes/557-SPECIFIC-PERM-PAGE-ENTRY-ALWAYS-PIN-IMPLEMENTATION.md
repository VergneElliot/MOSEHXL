# 557 — Specific permission page entry always PIN (IMPLEMENTATION)

## Summary

Tab / settings / admin section handlers short-circuited with `hasAccess` when the
focused badge already held a **specific** right, so Closures, Administration,
Paramètres (hors Profil), etc. opened without a PIN. Aligned with PLAN **549** /
slice A: always call `ensureAccess` / `ensurePermission` for specific keys.

## Files changed

- `MuseBar/src/components/common/AppRouter.tsx` — tab entry via
  `canEnterWithoutStepUpPin` + always `ensureAccess` for specific
- `MuseBar/src/components/Settings/Settings/SettingsTabs.tsx` — drop hasAccess skip
- `MuseBar/src/components/Administration/AdministrationContainer.tsx` — same
- `MuseBar/src/hooks/useTableInterventionGate.ts` — no admin silent bypass
- `MuseBar/src/contexts/stepUpPageEntryPolicy.ts` (+ test)
- skill + CHANGELOG

## Behaviour matrix

| Feature | Gate | Checkbox |
|---------|------|----------|
| Happy Hour / Offert / Perso / Remise | `ensurePermission` (already) | yes |
| Intervene other waiter’s table | `ensurePermission` (admin no longer skips) | yes |
| Cancel / validated remove | `ensurePermission` (already) | yes |
| Paramètres → Profil | free (basic) | n/a |
| Paramètres → other sub-tabs | always `ensureAccess` | menu / settings |
| Bulletins de clôture tab | always `ensureAccess` | access_closure |
| Administration tab + sections | always `ensureAccess` | per section |
| Admin « Pointage » section | free (basic) | n/a |

Scope reuse after a successful PIN for that visit is unchanged (`releaseAccess` on leave).

## Verification

- [x] `stepUpPageEntryPolicy.test.ts`, `stepUpElevationPolicy.test.ts`
- [x] type-check musebar
- [ ] Manual: manager badge → Closures / Admin / Settings→Menu → PIN each first entry

## Fiscal impact

PATCH — authorization UX only.
