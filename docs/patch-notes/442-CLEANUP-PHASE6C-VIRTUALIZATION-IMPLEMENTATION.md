# 442 - Cleanup Phase 6C: POS list virtualization - Implementation

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/441-CLEANUP-PHASE6C-VIRTUALIZATION-PLAN.md`  
Prior: Phase 7 (`440`) — venue still lags on large carts

---

## 1) Context

Phases 6/6B/7 improved cold start and per-tap work, but large orders still stress
the main thread (many MUI product cards + order lines in DOM). Phase 6C caps visible
DOM nodes via windowing.

---

## 2) What changed

| File | Change |
|------|--------|
| `MuseBar/package.json` | `react-virtuoso` dependency |
| `MuseBar/src/hooks/useGridColumnCount.ts` | **New** — responsive column count via `ResizeObserver` |
| `MuseBar/src/components/POS/ProductGrid.tsx` | `VirtuosoGrid`; Divers as grid index 0; fixed card heights |
| `MuseBar/src/components/POS/POSMenuPanel.tsx` | Menu scroll region `overflow: hidden` + full height for grid |
| `MuseBar/src/components/POS/OrderSummary.tsx` | `Virtuoso` for cart lines; stable `renderOrderLine` callback |

### Behaviour preserved

- Divers card still first in product grid (scrolls with catalog)
- Responsive column widths (190 / 220 / 230 px min)
- Order line actions (offert, perso, happy hour, notes, remove)
- Payment footer pinned below virtualized list

---

## 3) Bundle impact (Vite build)

| Metric | Phase 7 | Phase 6C |
|--------|---------|----------|
| Main entry gzip | ~189 KB | **~210 KB** (+21 KB, `react-virtuoso`) |
| Runtime DOM | All products + all lines | **Visible window only** |

Trade-off: slightly larger bundle, much fewer nodes when catalog/cart is large.

---

## 4) Verification

| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ |
| `npm run test:ci` | ✅ 24 tests |
| `npm run build` | ✅ |

**Venue gate (pending deploy):** large cart (15+ lines) + full catalog scroll on DISH PC.

---

## 5) Rollback

Revert Phase 6C commit. No API/DB changes.

---

## 6) Next steps

1. Deploy after local/venue sign-off (hard refresh).
2. If large-cart lag remains → Phase 8 (SvelteKit POS) or further hot-path MUI trimming.
