# 179 - P0-L5 (Journal Integrity Verifier Strictness) - Implementation

Date: 2026-04-30  
Related plan: `docs/patch-notes/178-P0-L5-JOURNAL-INTEGRITY-VERIFIER-STRICTNESS-PLAN.md`

## What was implemented

This patch removes silent bypass behavior from legal-journal integrity verification so `verifyJournalIntegrity(...)` reports any real chain mismatch.

---

## 1) Tightened verifier logic to strict mode

Updated:
- `MuseBar/backend/src/models/legalJournal/journalSigning.ts`

Changes:
- Removed documented-issues pre-query (`CORRECTION` + `HASH_CHAIN_INTEGRITY` lookup).
- Removed hard-coded exception logic:
  - no special handling for `sequence_number === 128`,
  - no skip for `transaction_type === 'CORRECTION'`.
- Hash continuity and recomputed-hash mismatches are now always recorded as errors.
- Return contract remains unchanged:
  - `isValid: errors.length === 0`,
  - `errors` list returned as-is.

Result:
- Verifier no longer suppresses failures; integrity output is strict and deterministic.

---

## 2) Updated regression tests for strict behavior

Updated:
- `MuseBar/backend/src/models/legalJournal/journalSigning.integrity.test.ts`

Changes:
- Existing tests now expect a single query call (entries query only).
- Added new strictness regression:
  - a broken chain with `CORRECTION` entry at sequence `128` now returns invalid
    (proving previous bypass behavior is gone).

Coverage now includes:
1. coherent chain => valid,
2. broken previous hash => invalid,
3. correction-row + sequence-128 mismatch => invalid (no bypass).

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/models/legalJournal/journalSigning.integrity.test.ts` ✅
   - Result: 1 file passed, 3 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `journalSigning.ts`
     - `journalSigning.integrity.test.ts`
     - `178-P0-L5-...-PLAN.md`

---

## Outcome

P0-L5 is implemented:

- `verifyJournalIntegrity` is now strict and transparent,
- hidden correction/sequence exceptions are removed,
- tests enforce the new behavior.

Follow-up (separate patch scope):
- if historical data contains known broken segments, treat remediation as data repair work
  (not verifier logic exceptions).
