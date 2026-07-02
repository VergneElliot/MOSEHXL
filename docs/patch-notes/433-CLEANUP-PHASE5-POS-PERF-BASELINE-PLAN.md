# 433 - Cleanup Phase 5: POS performance baseline - Plan

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Goal

Establish a **documented performance baseline** before any React optimization or framework
migration. Stop guessing about POS lag; capture numbers that Phase 6+ must beat.

**Deliverable:** `docs/reports/2026-06-24-pos-perf-baseline.md`

---

## 2) Scope

### In scope

| Workstream | Method | Owner |
|------------|--------|-------|
| Production bundle size | `npm run build` + asset inventory | Automated (CI/dev machine) |
| Public Lighthouse (unauthenticated shell) | Lighthouse CLI on `https://mosehxl.com` | Automated |
| Cloud RTT | `curl` timing to production | Automated |
| Architecture audit | Code review: imports, code splitting, tab mounting | Static analysis |
| On-site POS capture procedure | Runbook for bar tablet / DISH terminal | Documented checklist |
| Repeatable script | `scripts/pos-perf-baseline.sh` | Repo tooling |

### Out of scope (Phase 6+)

- Implementing lazy routes or memoization
- CRA → Vite migration
- SvelteKit rewrite
- Backend profiling (unless Phase 5 on-site data implicates API latency)

---

## 3) Known constraints

1. **POS is behind authentication** — CI Lighthouse hits the login shell (`/`), not the
   authenticated Caisse tab. On-site capture is required for real POS interaction metrics.
2. **CRA single-chunk build** — `react-scripts build` emits one `main.*.js`; no
   `React.lazy` usage today.
3. **Tab UI loads all screen modules eagerly** — `AppRouter.tsx` statically imports POS,
   Menu, History, Legal, Admin, etc., even though only one tab is visible.

---

## 4) Execution steps

1. Add `scripts/pos-perf-baseline.sh` (build + size report + optional ping).
2. Run script and Lighthouse locally; record numbers in the baseline report.
3. Document architecture findings (eager imports, no route splitting).
4. Write `docs/runbooks/POS-PERF-BASELINE-CAPTURE.md` for venue measurements.
5. Write `docs/reports/2026-06-24-pos-perf-baseline.md` with:
   - automated measurements,
   - preliminary hypotheses,
   - Phase 6 priority list,
   - decision-gate criteria,
   - blank tables for on-site device fill-in.
6. Update cleanup roadmap checkpoint (Phase 5 → done).

---

## 5) Decision gate (for Phase 6)

Proceed to Phase 6 quick wins if **any** of:

- On-site POS tap feels sluggish after warm load, or
- Authenticated Lighthouse TBT > 300 ms on reference device, or
- Main bundle remains > 250 KB gzip with all screens eager-loaded

Skip to framework migration (Phase 7–8) only if Phase 6 quick wins fail to meet on-site targets.

---

## 6) Verification

1. Baseline report exists and contains real measured numbers (not placeholders only).
2. Runbook exists for on-site capture.
3. `scripts/pos-perf-baseline.sh` exits 0 after a successful build.
4. Roadmap updated.

---

## 7) Rollback

Documentation-only change. Revert commit if needed; no runtime impact.
