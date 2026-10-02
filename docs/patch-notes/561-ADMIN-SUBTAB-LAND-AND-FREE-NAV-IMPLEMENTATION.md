# 561 — Admin sub-tabs: land on held right + free in-page nav (IMPLEMENTATION)

## Summary

Administration no longer always opens on Boîte mail / re-PIN every sub-tab.

1. **Landing** — first sub-tab the focused PIN already holds (else Pointage).
2. **In-page nav** — free among rights that PIN holds (or scopes opened this visit);
   other sub-tabs still step-up. Removed per-section `releaseAccess` that cleared
   sibling scopes on each switch.

Main Administration entry PIN (AppRouter) unchanged.

## Files

- `adminSectionAccess.ts` (+ test)
- `AdministrationContainer.tsx`
- `administration-space` skill

## Fiscal impact

PATCH — authorization UX only.
