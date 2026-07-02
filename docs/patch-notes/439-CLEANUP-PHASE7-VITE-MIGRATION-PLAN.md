# 439 - Cleanup Phase 7: CRA → Vite migration - Plan

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Prior: Phase 6B (`438`) — venue retest **failed** lag gate on DISH cashier PC

---

## 1) Goal

Replace unmaintained `react-scripts` (CRA) with **Vite** while keeping React. Targets:

- Leaner production bundles and better code-splitting
- Faster dev feedback loop
- Modern TypeScript (5.x)
- Foundation for Phase 8 (SvelteKit is Vite-based)

**Decision gate:** venue subjective feel + bundle metrics vs Phase 5 baseline.

---

## 2) Scope

### In scope

| Workstream | Change |
|------------|--------|
| Build toolchain | `vite.config.ts`, root `index.html`, remove `react-scripts` |
| Env vars | `REACT_APP_*` → `VITE_*` (`VITE_API_URL`, etc.) |
| TypeScript | 4.9 → 5.x; `moduleResolution: bundler` |
| Tests | Jest (CRA) → Vitest + jsdom |
| CI | `frontend-test` + `build-and-deploy` use Vite scripts |
| Output dir | Keep `build/` so production deploy scripts unchanged |
| Docs | Plan (this), implementation note, roadmap checkpoint |

### Out of scope

- SvelteKit rewrite (Phase 8)
- Product grid virtualization (Phase 6C — revisit if 7 insufficient)
- Backend changes

---

## 3) Acceptance criteria

| Criterion | Target |
|-----------|--------|
| `npm run build` (MuseBar) | ✅ Vite production build |
| `npm run test:ci` | ✅ All frontend tests green |
| CI `frontend-test` | ✅ Green |
| App behavior | Identical routes, POS, auth, API |
| Production `.env.production` | `VITE_API_URL=https://mosehxl.com` at build time |
| Bundle | ≤ Phase 6 main gzip or smaller with better chunking |

---

## 4) Rollback

Revert Phase 7 commit; restore `react-scripts` build. No API/DB changes.

---

## 5) Production deploy notes

Update server `/var/www/MOSEHXL/MuseBar/.env.production`:

```
VITE_API_URL=https://mosehxl.com
```

(Replaces `REACT_APP_API_URL`.)
