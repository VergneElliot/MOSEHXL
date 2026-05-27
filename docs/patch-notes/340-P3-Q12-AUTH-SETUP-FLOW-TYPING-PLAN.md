# 340 — P3-Q12 auth/setup flow typing plan

## Objective

Continue `P3-Q12` by removing `any` from the next high-value frontend cluster: auth invitation onboarding and establishment account-creation setup flow components.

## Scope

### In scope

- Replace `any` in auth invitation flow component props with explicit invitation interfaces.
- Replace `any` in establishment account-creation setup flow payload/result types.
- Remove unsafe `as any` casts used for MUI icon/chip color props by introducing typed unions.
- Verify frontend type-check + eslint on touched files.

### Out of scope

- Broad refactors outside auth/setup/account-creation paths.
- Remaining `any` hotspots in unrelated services/hooks.

## Design decisions

1. Add a shared `InvitationData` type for auth invitation components to avoid duplicate local definitions and untyped props.
2. Introduce explicit setup step payload/result types in `EstablishmentAccountCreation/types.ts` and use them end-to-end.
3. Use narrow union types for UI semantic colors (`error`/`warning`/`info`/`success`) to eliminate `as any` in color props.

## Verification plan

- `npm run type-check` (frontend)
- `npx eslint` on modified auth/setup files
