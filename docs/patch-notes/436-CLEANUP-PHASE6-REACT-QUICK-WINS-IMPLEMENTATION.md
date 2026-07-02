# 436 - Cleanup Phase 6: React quick wins - Implementation

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/435-CLEANUP-PHASE6-REACT-QUICK-WINS-PLAN.md`  
Baseline: `docs/reports/2026-06-24-pos-perf-baseline.md`

---

## 1) Context

Phase 5 measured a **271 KB gzip** single-chunk CRA bundle with all establishment tabs
eagerly imported. Cashier PC showed subjective input lag. Phase 6 targets smaller cold
start and fewer POS re-renders on cart updates — no framework change.

---

## 2) What changed

### Tab + route code splitting

| File | Change |
|------|--------|
| `MuseBar/src/components/common/appLazyTabPanels.tsx` | **New** — lazy exports for Menu, History, Settings, Legal, Closure, Admin + `TabPanelFallback` |
| `MuseBar/src/components/common/AppRouter.tsx` | `POSContainer` stays eager; other tabs behind `React.lazy` + `Suspense`; `useMemo` for `posLinePermissions` |
| `MuseBar/src/App.tsx` | Lazy `SystemAdminRouter`, `BusinessSetupWizard`, `EstablishmentAccountCreation` |

### POS hot-path optimizations

| File | Change |
|------|--------|
| `MuseBar/src/hooks/usePOSLogic.ts` | `useCallback` for `calculateProductPrice` / `calculateItemTotal` |
| `MuseBar/src/components/POS/ProductGrid.tsx` | `React.memo` on `ProductGrid` and `ProductCard` |
| `MuseBar/src/components/POS/CategoryFilter.tsx` | `React.memo` wrapper |
| `MuseBar/src/components/POS/POSContainer.tsx` | Stable handlers; lazy `PaymentDialog`, `DiversDialog`, `ProductOptionDialog`, `PrintAfterSaleDialog` (load on open) |

### Deferred (per plan)

- List virtualization
- Optimistic payment UI
- Vite / SvelteKit

---

## 3) Bundle comparison (CRA `npm run build`)

| Metric | Phase 5 baseline | Phase 6 |
|--------|------------------|---------|
| `main.*.js` gzip | **271 KB** | **189 KB** (−82 KB, **−30%**) |
| `main.*.js` raw | 943 KB | 637 KB |
| Async chunks | 0 | **22** lazy chunks |
| Initial POS path | Full app | Caisse + shared shell only |

Non-POS screens (Menu, Legal, Admin, payment dialogs, etc.) now load on first visit/open.

---

## 4) Verification

| Check | Result |
|-------|--------|
| `npm run build` | ✅ |
| `npm test -- --watchAll=false` | ✅ 23 tests |
| ESLint (POSContainer hook deps) | ✅ fixed after destructuring `logic` |

**On-site gate (pending deploy):** subjective tap/keyboard feel on cashier DISH PC.

---

## 5) Rollback

Single revert of this commit restores monolithic bundle behavior. No DB/API changes.

---

## 6) Next steps

1. Deploy to production (`209.38.223.91`, `/var/www/MOSEHXL`).
2. Hard-refresh cashier browser; test Caisse add-to-cart, payment, divers, options.
3. If still laggy → consider virtualization or Phase 7 (Vite); if snappy → Phase 7 optional.
