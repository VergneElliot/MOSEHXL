# 434 - Cleanup Phase 5: POS performance baseline - Implementation

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/433-CLEANUP-PHASE5-POS-PERF-BASELINE-PLAN.md`

---

## 1) Context

Track A cleanup (Phases 1–4F) is complete. Phase 5 establishes measured facts before
optimizing the React POS or migrating tooling/frameworks.

No application runtime code changed in this pass — documentation and repeatable tooling only.

---

## 2) What changed

### Baseline report

Added `docs/reports/2026-06-24-pos-perf-baseline.md` with:

- CRA bundle inventory (**943 KB raw / 271 KB gzip**, single chunk)
- Lighthouse on public `https://mosehxl.com/` (performance **0.93**, TBT **240 ms**)
- Network RTT samples from automation host
- Static architecture audit (no `React.lazy`, eager `AppRouter` imports)
- Phase 6 priority list and decision gate
- Blank on-site tables for venue hardware

### On-site runbook

Added `docs/runbooks/POS-PERF-BASELINE-CAPTURE.md` — step-by-step capture for authenticated
Caisse on bar tablet / DISH browser (Performance trace, RTT, warm/cold start).

### Repeatable script

Added `scripts/pos-perf-baseline.sh`:

- runs `npm run build` in `MuseBar/`
- prints bundle sizes and top static assets
- optional `curl` timing and Lighthouse CLI

---

## 3) Key findings (summary)

| Area | Result |
|------|--------|
| Bundle | One `main.*.js`; all screens shipped upfront |
| Code splitting | None (`React.lazy` unused) |
| Public Lighthouse | Good score; not representative of logged-in POS |
| Network (automation host) | ~60–120 ms to production — acceptable |
| Likely lag source | Frontend bundle + main-thread render on weak devices |

**Recommendation:** Start **Phase 6** with tab-level lazy loading and POS memoization.

---

## 4) Verification

1. `./scripts/pos-perf-baseline.sh` — exits 0 after successful build
2. Baseline report contains measured numbers (§2)
3. Runbook and plan documents present
4. Roadmap checkpoint updated (Phase 5 done)

---

## 5) Outcome

Phase 5 delivers the measurement foundation required by the cleanup roadmap. Phase 6 can
proceed without guessing; on-site table (report §4) should be filled when testing on venue
hardware.

---

## 6) Rollback

Documentation-only. Revert commit; no deploy or migration required.
