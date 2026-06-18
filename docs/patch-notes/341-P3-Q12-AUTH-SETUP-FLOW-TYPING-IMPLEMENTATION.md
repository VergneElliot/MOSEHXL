# 341 — P3-Q12 auth/setup flow typing implementation

## What changed

### 1) Auth invitation flow now uses explicit shared invitation type

Added:

- `MuseBar/src/components/auth/types.ts`

Updated:

- `MuseBar/src/components/auth/AccountSetupForm.tsx`
- `MuseBar/src/components/auth/InvitationSuccess.tsx`
- `MuseBar/src/components/auth/InvitationValidation.tsx`
- `MuseBar/src/components/InvitationAcceptance.tsx`

Changes:

- Replaced `invitation: any` props with `InvitationData`.
- Removed duplicate inline invitation interfaces and reused shared auth type.

### 2) Establishment account-creation setup flow typed end-to-end

Updated:

- `MuseBar/src/components/EstablishmentAccountCreation/types.ts`
- `MuseBar/src/components/EstablishmentAccountCreation/index.tsx`
- `MuseBar/src/components/EstablishmentAccountCreation/steps/InvitationValidationStep.tsx`

Changes:

- Replaced `details?: any` with `details?: Record<string, unknown>`.
- Added explicit setup payload types (`AccountCreationStepData`, `BusinessInfoStepData`, `SetupStepPayload`).
- Replaced step completion callback payload `any` with typed union payload.
- Replaced validation step `any` state/callback payload with `InvitationValidationResult`.

### 3) Removed unsafe MUI color casts

Updated:

- `MuseBar/src/components/EstablishmentAccountCreation/components/AccountCreationForm.tsx`
- `MuseBar/src/components/EstablishmentAccountCreation/steps/AccountCreationStep.tsx`
- `MuseBar/src/components/EstablishmentAccountCreation/steps/InvitationValidationStep.tsx`

Changes:

- Removed `as any` casts on `Security` icon and `Chip` color props.
- Introduced explicit semantic color unions to keep color props strictly typed.

### 4) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Changes:

- Kept `P3-Q12` as **in progress** and expanded the completion note to include this auth/setup/account-creation tranche.

## Verification

- `npm run type-check` (frontend) ✅
- `npx eslint` on touched auth/setup files ✅

## Notes

- This tranche removes high-value `any` usage in the onboarding/setup flows without changing runtime behavior.
- Additional `P3-Q12` frontend `any` cleanup remains for other modules.
