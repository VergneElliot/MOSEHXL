# 242 - P2-Q9 (HappyHour inline currency dedup) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-Q9)

## Why this patch exists

`HappyHourControl/useHappyHour.ts` still contains inline Euro formatting logic:

- `` `€${amount.toFixed(2)}` ``
- fixed-discount label string interpolation with `€`

This bypasses the shared currency formatter and breaks single-source formatting
consistency.

## Scope

### In scope

1. Replace inline currency formatting in `useHappyHour.ts` with shared
   `formatCurrency`.
2. Keep hook API contract unchanged (`formatCurrency(amount): string` still
   exposed).
3. Verify with frontend type-check and lint diagnostics.

### Out of scope

- Full Happy Hour UI currency sweep outside this hook.
- UX string/punctuation redesign.

## Design choices

1. **Use shared utility directly**
   - Import `formatCurrency` from `src/utils/formatCurrency`.
2. **Preserve outward behavior contract**
   - Keep returned `formatCurrency` function key in hook return object.
3. **Normalize fixed amount labels**
   - Route fixed-discount label through the same utility for consistent locale formatting.

## Strategy

### Step 1 - Hook dedup update

File:
- `MuseBar/src/components/HappyHour/HappyHourControl/useHappyHour.ts`

Plan:
1. Import shared formatter.
2. Replace inline formatter function implementation.
3. Replace fixed-discount label branch to use shared formatter.

### Step 2 - Verify

Run:
- frontend type-check,
- lint diagnostics on touched files/docs.

## Acceptance criteria

1. No inline Euro formatting remains in `useHappyHour.ts`.
2. Hook now uses shared `formatCurrency` helper.
3. Build/type-check remains green.
