# 435 - Cleanup Phase 6: React quick wins - Plan

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Baseline: `docs/reports/2026-06-24-pos-perf-baseline.md` (main **271 KB gzip**)

---

## 1) Goal

Reduce POS cold-start cost and cart-update jank on low-RAM cashier hardware **without**
changing frameworks. Re-measure bundle size and validate subjective feel on the venue PC
after deploy.

**Decision gate:** if Caisse feels snappy enough, Phase 7 (Vite) becomes optional.

---

## 2) Scope

### In scope

| Workstream | Change | Expected impact |
|------------|--------|-----------------|
| Tab code splitting | `React.lazy` + `Suspense` for Menu, History, Settings, Legal, Closure, Admin tabs | Smaller initial `main` chunk; defer heavy screens |
| App route splitting | Lazy SystemAdmin, Setup wizard, establishment setup | Smaller bundle for business users |
| POS re-render control | `React.memo` on `ProductGrid`, `ProductCard`, `CategoryFilter` | Cart updates skip ~N product cards |
| Stable callbacks | `useCallback` in `usePOSLogic`, `POSContainer`, `AppRouter` | Memoization actually effective |
| Dialog deferral | Lazy-load `PaymentDialog`, `DiversDialog`, `ProductOptionDialog`, `PrintAfterSaleDialog` | Pay chunk cost only when opened |
| Re-measure | `npm run build` + compare chunk inventory vs Phase 5 | Quantitative proof |

### Out of scope (later phases)

- List virtualization (`react-window` / `react-virtuoso`) — only if Phase 6 retest insufficient
- Optimistic payment UI (legal journal integrity)
- CRA → Vite (Phase 7)
- SvelteKit rewrite (Phase 8)
- MUI tree-shaking audit beyond existing imports

---

## 3) Known constraints

1. **POS tab stays eager** — `POSContainer` must be in the initial bundle; cashier lands on Caisse.
2. **CRA code splitting** — `import()` creates separate chunks; `main` should shrink materially.
3. **Memoization needs stable props** — `usePOSLogic` currently returns new function refs each render; fix first.
4. **Subjective success** — venue DISH/low-RAM PC is the real test; bundle metrics support but don't replace it.

---

## 4) Execution steps

1. Add `MuseBar/src/components/common/appLazyTabPanels.tsx` (lazy tab exports + fallback).
2. Refactor `AppRouter.tsx`: keep `POSContainer` static; lazy other tabs; `useMemo` for `posLinePermissions`.
3. Refactor `App.tsx`: lazy admin/setup routes behind `Suspense`.
4. `usePOSLogic.ts`: `useCallback` for `calculateProductPrice` / `calculateItemTotal`.
5. `ProductGrid.tsx` / `CategoryFilter.tsx`: `React.memo`.
6. `POSContainer.tsx`: stable handlers; lazy dialogs gated on `open`.
7. Run `npm run build` — record main + lazy chunk sizes.
8. Run `npm test` / lint / type-check.
9. Implementation patch note `436-*`, roadmap checkpoint update.
10. Commit + push; deploy to production; on-site retest.

---

## 5) Acceptance criteria

| Criterion | Target |
|-----------|--------|
| Initial `main.*.js` gzip | **< 271 KB** (Phase 5 baseline) |
| Lazy chunks present | ≥ 5 separate async chunks for tab panels |
| No functional regression | All tabs open; payment + divers + options dialogs work |
| POS cart add | Product grid does not visibly flash/repaint all cards |
| Venue subjective test | User reports improved tap/keyboard responsiveness |

---

## 6) Rollback

Revert the Phase 6 commit. CRA falls back to single-bundle behavior; no DB or API changes.
