# 346 — P3-Q13 noUncheckedIndexedAccess frontend plan

## Objective

Start `P3-Q13` by enabling `noUncheckedIndexedAccess` in frontend TypeScript config and fixing resulting strict-index errors without changing runtime behavior.

## Scope

### In scope

- Enable `noUncheckedIndexedAccess` in `MuseBar/tsconfig.json`.
- Resolve all frontend type-check errors introduced by the flag.
- Keep backend `tsconfig` unchanged in this tranche.
- Verify frontend and backend type-check stay green after frontend-only rollout.

### Out of scope

- Full backend rollout of `noUncheckedIndexedAccess` (tracked as immediate next tranche).

## Design decisions

1. Prefer safe defaults/guards (`?? ''`, `if (!x) return`) at index and split-array boundaries.
2. Preserve behavior by hardening existing logic instead of refactoring flows.
3. Keep strict-index fixes localized to the files surfaced by `tsc` to minimize regression risk.

## Verification plan

- `npm run type-check` in `MuseBar` (frontend)
- `npm run type-check` in `MuseBar/backend` (ensure no accidental backend regressions)
- `eslint` on touched frontend files
