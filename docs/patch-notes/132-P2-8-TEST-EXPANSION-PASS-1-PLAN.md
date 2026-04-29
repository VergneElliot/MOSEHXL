# 132 - P2-8 (Test Expansion Pass 1) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

The audit's remaining P2 step includes expanding fiscal-critical integration/regression coverage.  
This pass targets two high-value gaps:

1. Legal journal chain integrity verification behavior.
2. Printing configuration critical repository behavior (tenant scoping and provider/config handling).

## Scope

### In scope

1. Add tests for `JournalSigning.verifyJournalIntegrity(...)`:
   - valid chain path,
   - chain-break detection path.
2. Add tests for `printingConfigRepo`:
   - invalid JSON parsing/logging behavior,
   - tenant-scoped list query behavior and Epson poll metadata enrichment,
   - save flow query behavior and invalid provider rejection.
3. Run targeted tests and backend type-check.
4. Document implementation and verification.

### Out of scope

- Full end-to-end printing route suite.
- Full legal flow E2E with real DB.
- Broad test refactor.

## Design choices

- Use focused module-level tests with explicit query mocks for deterministic behavior.
- Assert tenant scoping at query-argument level (`establishment_id` propagation).
- Keep tests narrow and fast to integrate into CI quickly.

## Step-by-step plan

### Step 1 - Legal chain tests
- Add `journalSigning` regression tests for valid and tampered chain scenarios.

### Step 2 - Printing repo tests
- Add `printingConfigRepo` tests for parse/list/save critical logic and guards.

### Step 3 - Verification + docs
- Run targeted vitest files and backend type-check.
- Add implementation patch note with results.

## Acceptance criteria

- New tests pass and fail meaningfully on regressions.
- Backend type-check passes.
- Coverage meaningfully improves for legal-chain and printing critical module paths.
