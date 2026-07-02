# 437 - Cleanup Phase 6B: POS hot-path performance - Plan

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Baseline: `docs/reports/2026-06-24-pos-perf-baseline.md`  
Prior: Phase 6 (`436`) — bundle −82 KB gzip; venue lag on cart/keyboard unchanged

---

## 1) Goal

Reduce **per-tap / per-keypress** main-thread work on the Caisse hot path so cart
updates feel snappier on low-RAM cashier hardware. Phase 6B targets **runtime**
cost, not cold-start bundle size.

**Decision gate:** subjective “good enough” on venue DISH PC after deploy; optional
Performance trace (cart-add ms) in baseline report §4.

---

## 2) Root cause (Phase 6 venue feedback)

| Issue | Cause |
|-------|--------|
| Lag adding multiple items | Each quantity loop called `setState` separately → N re-renders |
| Menu sluggish while cart grows | `POSContainer` re-render rebuilt menu subtree even when filters unchanged |
| Big order lag | `OrderSummary` re-rendered all lines; inline handlers broke memo |
| Keyboard lag | Main thread blocked by React + MUI during cart reconciliation |

---

## 3) Scope

### In scope

| Workstream | Change |
|------------|--------|
| Batch cart updates | `addLinesToOrder` — single `setState` for multi-quantity adds |
| Stable POS state | `useCallback` / `useMemo` in `usePOSState` |
| Split catalog vs cart logic | `usePOSCatalogLogic` (no `currentOrder` dep) + `usePOSOrderTotals` |
| Isolated menu panel | `POSMenuPanel` (`React.memo`) — skips re-render when only cart changes |
| Isolated order panel | `POSOrderPanel` (`React.memo`) — owns order totals hook |
| Order list memo | `React.memo` on `OrderSummary` + `OrderSummaryItem`; stable line handlers |
| Docs + roadmap | Plan (this), implementation note, checkpoint |

### Out of scope (Phase 6C / 7 / 8)

- Product grid virtualization (`react-virtuoso`) — measure after 6B on venue
- CRA → Vite (Phase 7)
- SvelteKit rewrite (Phase 8)
- Optimistic payment UI
- Replacing MUI on hot path

---

## 4) Acceptance criteria

| Criterion | Target |
|-----------|--------|
| Single product tap (qty 1) | Menu panel does not re-render (React DevTools / Profiler) |
| Product tap qty N | One React commit, not N |
| Cart line edit | Only affected line re-renders where possible |
| Tests | `usePOSState` + existing frontend tests green |
| Venue subjective | Noticeably snappier multi-add vs pre-6B (user sign-off) |

---

## 5) Rollback

Revert Phase 6B commit. No API/DB changes.
