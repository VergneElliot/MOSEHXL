# 438 - Cleanup Phase 6B: POS hot-path performance - Implementation

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/437-CLEANUP-PHASE6B-POS-HOT-PATH-PLAN.md`  
Baseline: `docs/reports/2026-06-24-pos-perf-baseline.md`

---

## 1) Context

Phase 6 cut cold-start bundle size (−82 KB gzip) but venue testing on the DISH cashier PC
showed little improvement in cart/keyboard reactivity. Phase 6B targets **runtime** hot-path
work: fewer React commits per tap, and isolating the menu subtree from cart-driven re-renders.

---

## 2) What changed

### Split catalog vs cart state

| File | Change |
|------|--------|
| `MuseBar/src/hooks/usePOSCatalogLogic.ts` | **New** — filters, search, `calculateProductPrice`; no `currentOrder` dependency |
| `MuseBar/src/hooks/usePOSOrderTotals.ts` | **New** — `orderSubtotal` / `orderTax` / `orderTotal` from cart lines only |
| `MuseBar/src/hooks/usePOSLogic.ts` | Composes catalog + totals hooks; thinner facade for legacy callers |
| `MuseBar/src/hooks/usePOSState.ts` | Stable `useCallback`/`useMemo` actions; **`addLinesToOrder`** for batch cart updates |

### Isolated POS panels

| File | Change |
|------|--------|
| `MuseBar/src/components/POS/POSMenuPanel.tsx` | **New** — `React.memo`; owns `usePOSCatalogLogic`; skips re-render when only cart changes |
| `MuseBar/src/components/POS/POSOrderPanel.tsx` | **New** — `React.memo`; owns `usePOSOrderTotals` + `OrderSummary` |
| `MuseBar/src/components/POS/POSContainer.tsx` | Wires memo panels; batch `handleAddToOrder` via `addLinesToOrder`; stable quick-payment callbacks |

### Order list memoization

| File | Change |
|------|--------|
| `MuseBar/src/components/POS/OrderSummary.tsx` | `React.memo`; stable `handleEditLineNote` via `useCallback` |
| `MuseBar/src/components/POS/OrderSummaryItem.tsx` | `React.memo` wrapper |

### Tests

| File | Change |
|------|--------|
| `MuseBar/src/hooks/__tests__/usePOSState.test.ts` | Covers `addLinesToOrder` (single commit, two lines) |

### Deferred (per plan)

- Product grid virtualization (`react-virtuoso`) — measure on venue after deploy
- CRA → Vite (Phase 7)
- SvelteKit rewrite (Phase 8)

---

## 3) Expected runtime impact

| Scenario | Before 6B | After 6B |
|----------|-----------|----------|
| Add product qty N | N `setState` → N React commits | 1 `addLinesToOrder` → 1 commit |
| Cart grows | Menu + grid re-render with order panel | `POSMenuPanel` memo skips when catalog props unchanged |
| Edit line note | Full order list re-render | Memoized items; stable handlers |

Bundle size unchanged from Phase 6 (~189 KB gzip main). This phase is **latency**, not bytes.

---

## 4) Verification

| Check | Result |
|-------|--------|
| `npm run build` | ✅ |
| `npm test -- --watchAll=false` | ✅ 24 tests |
| ESLint (POS hot-path files) | ✅ |

**On-site gate (pending deploy):** subjective multi-add + keyboard feel on cashier DISH PC.
Optional: React Profiler — menu panel should not commit on single cart add.

---

## 5) Rollback

Single revert of this commit. No DB/API changes.

---

## 6) Next steps

1. Deploy to production (`209.38.223.91`, `/var/www/MOSEHXL`).
2. Hard-refresh cashier browser; test multi-quantity add, line edits, payment flow.
3. **Decision gate:** if still laggy → Phase 6C (virtualization) and/or Phase 7 (Vite); if snappy → stop perf track for now.
