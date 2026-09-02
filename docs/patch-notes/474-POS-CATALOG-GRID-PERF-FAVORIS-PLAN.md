# 474 — POS catalog grid performance and Favoris derendering (PLAN)

## Context

After Phase 6C (`react-virtuoso` on the product grid), cashiers reported scroll tearing on
product cards. Subsequent fixes (Virtuoso tuning, `content-visibility: auto`, Virtuoso
restore) traded one symptom for another: input lag, scroll blanks, or stale favorite cards
stuck at the top when leaving **Tous**.

Root cause analysis showed:

1. **Render cost** — each MUI product card instantiated ~28 components and ~12 Emotion `sx`
   serializations; ~70 cards meant ~2 000 component instances per category switch (~2 s on
   the establishment POS).
2. **Scroll tearing** — hover `box-shadow` transitions fired while cards moved under a
   stationary pointer during scroll.
3. **Favoris stuck on top** — **Tous** intentionally duplicates favorite products (block at
   top + category section). The grid keyed cards with `product.id` only, violating React’s
   unique-key rule among siblings and breaking reconciliation when switching category or
   search.

## Scope

| Area | Files |
|------|--------|
| POS catalog UI | `ProductGrid.tsx`, `ProductGrid.css`, `POSMenuPanel.tsx` |
| Catalog logic | `usePOSCatalogLogic.ts`, `posCatalogOrdering.ts` (unchanged behaviour) |
| Print bridge latency | `bridgePrintJobRepo.ts`, `bridgeRoutes.ts`, `MuseBar/bridge/*`, runbook |
| Skills | `pos-and-floor-service`, `printing-and-receipts` |

## Approach

1. Replace MUI card stack with plain DOM + static CSS; theme via CSS custom properties on
   the grid container; category colours via shared style objects per category.
2. Remove Virtuoso and `content-visibility` from the product grid (catalog &lt; 100 items).
3. Remove hover elevation on cards to eliminate scroll repaint tearing.
4. Fix list keys: `` `${index}:${product.id}` `` on **Tous** duplicates; remount grid on
   catalog view change (`tous` / `favoris` / category / `search`); gate star badge to
   **Tous** and **Favoris** only.
5. Add print-bridge latency instrumentation (`queued_ms`, bridge log timings, status API
   fields) and lower default `POLL_INTERVAL_MS` to 500.

## Verification

- [ ] Category switch feels instant on establishment POS (~70 products)
- [ ] Fast scroll: no tearing, no multi-second blanks
- [ ] **Tous** → category → search: favorites block does not stick at top
- [ ] Star badge only on **Tous** / **Favoris**
- [ ] `npm run type-check --workspace MuseBar`
- [ ] `npm test --workspace MuseBar` (frontend)
- [ ] Bridge logs show `queuedMs` / `printMs` on test print

## Risks

- Visual parity: CSS must match prior MUI sizing (fonts, paddings, breakpoints).
- Grid remount on view change resets scroll position (acceptable for category chips).
- Bridge default poll interval change requires bridge restart on bar PC.

## Fiscal impact

None — UI and print delivery timing only; no change to legal journal, orders, or closures.
