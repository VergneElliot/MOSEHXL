# 569 — Q — Unit test coverage Slice E: CI ratchet & tooling (IMPLEMENTATION)

## Summary

Closes PLAN **564** multi-slice campaign: document measured floors, wire root coverage script, update `testing-and-ci` skill with “never lower the ratchet”, and soft-raise FE overall lines/statements to **18%** (measured ~20.4% on the business-logic include).

Fiscal impact: **PATCH** — tests, thresholds, and docs only.

## Campaign totals (after slices A–D)

| Workspace | Lines (measured) | CI floor | Notes |
|-----------|------------------|----------|-------|
| Backend | **~47.2%** | **43%** lines/stmts; branches **62%**; funcs **52%** | Denominator excludes deferred setup/storage/userInvitation/migrations |
| Frontend (business-logic include) | **~20.4%** | **18%** lines/stmts; branches/funcs **60%** | UI `.tsx` containers excluded from denominator |
| Frontend pure globs | utils / policies / drafts / totals / split* etc. | **≥80%** lines/stmts (floorTicketMappers branches **65%**) | Glob keys in `vite.config.ts` |

End-state aspirational floors from PLAN 564 (backend **70%**, FE overall **40%**) remain next-ratchet targets — do not lower current floors; raise only with margin under measured %.

## Tooling

- Root: `npm run test:coverage` → FE `test:ci` + backend `test:coverage`
- `MuseBar/backend/vitest.config.ts` — `coverage.thresholds` (added in Slice C, ratcheted through waves)
- `MuseBar/vite.config.ts` — overall + pure-module glob thresholds
- Skill: `.cursor/skills/testing-and-ci/SKILL.md` — current floors + never-lower policy
- `docs/CURRENT-TRUTH.md` — coverage campaign pointer

## Prior slice notes

- **565** Slice A — pure helpers
- **566** Slice B — admin route permissions
- **567** Slice C — services/models (+ waves 2–3)
- **568** Slice D — FE policies/mappers (+ wave-2 include)

## Verification

- [x] FE `npm run test:ci --workspace MuseBar` green with 18% + pure 80% globs
- [x] Backend suite + coverage thresholds green at 43/62/52
- [x] Index regenerated
- [x] Fiscal impact: **PATCH**
