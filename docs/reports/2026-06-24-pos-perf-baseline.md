# POS Performance Baseline Report

Date: 2026-07-02  
Roadmap: Cleanup Phase 5 (`docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`)  
Plan: `docs/patch-notes/433-CLEANUP-PHASE5-POS-PERF-BASELINE-PLAN.md`  
On-site procedure: `docs/runbooks/POS-PERF-BASELINE-CAPTURE.md`

This report is the **yardstick** for Phase 6+ work. Re-measure after optimizations and
compare against the tables below.

---

## 1) Executive summary

| Finding | Severity | Phase 6 action |
|---------|----------|----------------|
| **Single JS bundle (~944 KB raw / ~271 KB gzip)** — all screens loaded upfront | High | Route/tab lazy loading |
| **No `React.lazy` / code splitting** in frontend | High | Split Caisse from Menu/Legal/Admin |
| **All `AppRouter` tabs imported statically** | High | Lazy-import tab panels |
| Public Lighthouse score good (0.93) but measures **login shell only** | Info | On-site authenticated capture still required |
| Cloud RTT from dev host ~60–120 ms | Low | Re-check on venue Wi‑Fi |
| Backend not implicated in this pass | — | Profile API only if on-site shows slow `POST /api/orders` |

**Preliminary verdict:** POS lag on weak hardware is likely **frontend bundle + main-thread
work**, not backend language or production hosting latency. **Proceed to Phase 6** after
optional on-site table fill-in (§4).

---

## 2) Automated measurements (2026-07-02)

Captured from development host running `scripts/pos-perf-baseline.sh` and Lighthouse CLI.

### 2.1 Production bundle (`npm run build` — CRA)

| Asset | Size |
|-------|------|
| `main.*.js` (raw) | **943 KB** |
| `main.*.js` (gzip, CRA report) | **271 KB** |
| Source map | 4.1 MB (deploy artifact; not downloaded by browsers unless DevTools open) |

CRA emits **one** JavaScript chunk. No lazy-loaded routes.

Top dependencies (from `package.json`, qualitative):

- `@mui/material` + `@mui/icons-material` + `@emotion/*`
- `react` + `react-dom` + `react-router-dom`
- `i18next` + `react-i18next`

### 2.2 Lighthouse — public shell (`https://mosehxl.com/`, unauthenticated)

| Metric | Value |
|--------|-------|
| Performance score | **0.93** |
| First Contentful Paint | 0.8 s |
| Largest Contentful Paint | 2.5 s |
| Total Blocking Time | **240 ms** |
| Time to Interactive | 2.9 s |
| Speed Index | 0.8 s |
| CLS | 0 |
| Transfer size (page) | 267 KiB |

**Caveat:** User lands on login/marketing shell, not Caisse. Authenticated POS may score
worse due to larger runtime work after loading the full `main` bundle and hydrating MUI.

### 2.3 Network RTT (development host → production)

| Target | TTFB / total |
|--------|----------------|
| `GET https://mosehxl.com/` | TTFB **122 ms**, total **122 ms** |
| `GET https://mosehxl.com/api/health` | total **61 ms** |

Venue Wi‑Fi numbers may differ; record in §4.

### 2.4 CI reference

GitHub Actions runs Lighthouse against `http://localhost:3000` after production build
(see `.lighthouserc.json`, `ci-cd.yml` `lighthouse` job). Thresholds are intentionally
low (`minScore: 0.4`) warn-only.

---

## 3) Architecture audit (static)

### 3.1 No code splitting

```text
grep React.lazy MuseBar/src → no matches
```

Entire app ships in `main.*.js`.

### 3.2 Eager tab imports (`AppRouter.tsx`)

These are **statically imported** at module load:

- `POSContainer`, `MenuContainer`, `HistoryContainer`, `Settings`
- `LegalComplianceDashboard`, `ClosureContainer`
- `UserManagement`, `AuditTrailDashboard`

Only one tab is visible, but the browser downloads and parses code for **all** screens
before Caisse is usable.

### 3.3 Tab mounting

`TabPanel` renders children only when active (`isActive`), which avoids mounting inactive
DOM trees — but does **not** avoid shipping inactive screen code in the bundle.

### 3.4 POS hot path (for Phase 6 profiling)

Primary interaction loop:

```text
Login → Caisse tab → product grid tap → cart update → payment → POST /api/orders
```

Profiler / Performance trace should focus on **cart state updates** and product grid render.

---

## 4) On-site measurements (fill in at venue)

Use `docs/runbooks/POS-PERF-BASELINE-CAPTURE.md`.

| Field | Value |
|-------|-------|
| Device | _TBD_ |
| RAM / OS | _TBD_ |
| Browser | _TBD_ |
| Network | _TBD_ |
| Date | _TBD_ |

| Scenario | Target | Measured | Notes |
|----------|--------|----------|-------|
| Cold start → Caisse interactive | < 5 s | | |
| Warm tap → cart updates | feels instant | | subjective |
| Lighthouse TBT (mobile, logged in) | < 300 ms | | |
| `GET /api/products` TTFB on venue Wi‑Fi | < 200 ms | | |
| `POST /api/orders` (excl. think time) | < 800 ms | | |

---

## 5) Phase 6 priority list (ordered)

1. **Lazy-load non-POS tabs** (`React.lazy` + `Suspense` per `AppRouter` panel) — largest bundle win on CRA without ejecting.
2. **Split legal/admin/settings** from initial parse — defer until first navigation.
3. **Memoize POS cart hot path** — stabilize callbacks; split context if cart updates re-render unrelated UI.
4. **Virtualize product grid** if catalog > ~50 visible tiles (measure first).
5. **Optimistic UI on pay** — only after measuring; fiscal write must remain authoritative.

---

## 6) Decision gate (Phase 5 → Phase 6)

| Criterion | Status |
|-----------|--------|
| Baseline report published | **Done** |
| Automated bundle + Lighthouse captured | **Done** |
| On-site venue table | **Pending** (optional before starting Phase 6; recommended when testing on DISH/tablet) |
| Proceed to Phase 6 | **Yes** — bundle architecture alone justifies quick wins |

Phase 7 (CRA → Vite) remains valuable for build speed and better splitting, but Phase 6
can start on current CRA.

Phase 8 (SvelteKit) — **hold** until Phase 6 re-measurement on reference device.

---

## 7) Re-measurement checklist

After Phase 6 changes, update this file with:

- [ ] New `main.*.js` gzip size
- [ ] Lighthouse TBT delta
- [ ] On-site subjective tap feel
- [ ] Performance trace long-task count on add-to-cart

---

## 8) Tooling

```bash
# From repo root
chmod +x scripts/pos-perf-baseline.sh
./scripts/pos-perf-baseline.sh
```

Optional env overrides: `POS_PERF_API_URL`, `POS_PERF_WEB_URL`.
