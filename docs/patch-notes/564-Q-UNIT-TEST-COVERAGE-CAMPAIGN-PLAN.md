# 564 — Q — Unit testing coverage campaign (PLAN)

## Context

Measured coverage (`vitest --coverage`, Oct 2026):

| Workspace | Statements / Lines | Branches | Functions |
|-----------|--------------------|----------|-----------|
| Backend | **~30%** | ~60% | ~46% |
| Frontend | **~2.7%** | ~67% | ~68% |

Frontend CI still enforces **1%** lines (`MuseBar/vite.config.ts`). Backend reports coverage with **no thresholds**. Strength today: auth, orders, legal, floor, printing. Gaps: admin routes, most services/models, FE UI, and pure helpers from hygiene 562/563.

## Goals

Professional CI-gated floors (ratcheted, never lowered):

- **Backend:** lines/statements ≥ **70%**, branches ≥ **65%**, functions ≥ **70%**
- **Frontend:** overall lines/statements ≥ **40%**; ≥ **80%** on pure modules (`utils/`, policies, drafts, totals, split/planning helpers)

Do **not** chase 100% of MUI containers. Fiscal impact: **PATCH** (tests only).

## Scope (multi-slice)

| Slice | IMPLEMENTATION | Focus |
|-------|----------------|-------|
| A | 565 | Pure helpers (FE + BE) |
| B | 566 | Admin API routes (PIN + happy path) |
| C | 567 | High-value backend services/models |
| D | 568 | FE policies / hooks / mappers |
| E | 569 | CI thresholds, docs, skills |

## Approach

1. Colocated `*.test.ts` for pure modules first (highest ROI).
2. Admin routes: pattern from `businessDayStats.permissions.test.ts` + `pinActorTestUtils`.
3. Services/models with mocked `pool`; keep real-db suite for fiscal SQL.
4. Extend PIN/step-up policies; light Testing Library only for non-trivial branching.
5. Ratchet CI thresholds with ~3–5 point margin below measured %.

## Verification

- [ ] Each slice: new tests + full workspace suites green
- [ ] Coverage % recorded in each IMPLEMENTATION note
- [ ] Thresholds raised only when safely above measured %
- [ ] Fiscal impact: **PATCH**

## Risks

- Flaky crypto/login tests under load — keep deterministic timeouts
- Over-mocking routes — always exercise real `requirePermission` + PIN header
- Raising thresholds too fast — margin below measured %
