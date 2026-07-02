# 441 - Cleanup Phase 6C: POS list virtualization - Plan

Date: 2026-07-02  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Prior: Phase 7 (`440`) — Vite + legacy; venue reports large-cart lag remains

---

## 1) Goal

Keep React but cap DOM size on the Caisse hot path: only render **visible** product
cards and order lines. Targets venue feedback: menu + cart sluggish when order grows.

**Decision gate:** subjective feel on DISH PC with 15+ line cart; then Phase 8 if needed.

---

## 2) Scope

| Workstream | Change |
|------------|--------|
| Product grid | `react-virtuoso` `VirtuosoGrid` — responsive columns, Divers pinned above grid |
| Order list | `Virtuoso` for `currentOrder` lines in `OrderSummary` |
| Layout | Menu/order panels pass fixed height into virtualized scroll regions |
| Docs | Plan (this), implementation note, roadmap |

### Out of scope

- SvelteKit rewrite (Phase 8)
- Replacing MUI on hot path
- History/admin list virtualization

---

## 3) Acceptance criteria

| Criterion | Target |
|-----------|--------|
| 50+ products | Only ~visible cards in DOM (Profiler / Elements) |
| 20+ cart lines | Only ~visible lines in DOM |
| UX | Grid columns, Divers card, line actions unchanged |
| Tests/build | `npm run build` + `npm run test:ci` green |

---

## 4) Rollback

Revert Phase 6C commit. No API/DB changes.
