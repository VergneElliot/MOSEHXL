# 212 - P1-Q3 (Resolve `useHappyHour` name collision) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-Q3)

## Why this patch exists

The frontend currently defines two different hooks with the same exported name:

1. `MuseBar/src/hooks/useHappyHour.ts`
2. `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts`

Even though they live in different paths, sharing the same exported identifier
causes mental overhead and increases the risk of wrong imports during future
refactors.

## Scope

### In scope

1. Rename the HappyHourControl-specific hook export to a unique name.
2. Update all local imports/exports referencing that hook.
3. Keep public behavior unchanged.
4. Document implementation and verification.

### Out of scope

- Reworking Happy Hour architecture.
- Consolidating both hooks into one implementation.
- Feature behavior changes.

## Design choices

1. **Rename only the control-module hook**
   - `useHappyHour` (inside `HappyHourControl`) becomes `useHappyHourControl`.
   - Keeps global app-level `useHappyHour` untouched.

2. **Minimal-risk refactor**
   - Keep file paths unchanged.
   - Only rename symbol exports/imports to avoid unnecessary churn.

## Strategy

### Step 1 - Rename hook symbol

File:
- `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts`

Plan:
- Rename exported function to `useHappyHourControl`.

### Step 2 - Update call sites

Files:
- `MuseBar/src/components/HappyHour/HappyHourControl/HappyHourControlContainer.tsx`
- `MuseBar/src/components/HappyHour/HappyHourControl/index.ts`

Plan:
- Replace imports/exports of `useHappyHour` with `useHappyHourControl`.

### Step 3 - Verify

Run:
- frontend type-check,
- frontend lint diagnostics on touched files.

## Acceptance criteria

1. No duplicate exported hook name remains for Happy Hour control path.
2. Happy Hour control module compiles with renamed hook.
3. No functional behavior change in Happy Hour control flow.
