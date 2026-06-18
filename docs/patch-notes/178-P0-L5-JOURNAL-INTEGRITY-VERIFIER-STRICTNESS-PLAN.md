# 178 - P0-L5 (Journal Integrity Verifier Strictness) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L5)

## Why this patch exists

`JournalSigning.verifyJournalIntegrity(...)` currently includes bypass logic that can suppress real integrity failures:

- hard-coded skip for `sequence_number === 128`,
- skip for `CORRECTION` entries when a documented correction exists,
- "documented issue" query that can convert a broken chain into a "compliant" result.

For a legal integrity verifier, this is unsafe. The verifier must report what the chain contains, not reinterpret failures as acceptable.

## Beginner-friendly framing

The verifier is the "detector" that tells us if the legal journal has been altered.

Today, the detector has exceptions:

- "if it's this old sequence number, ignore it,"
- "if there's a correction row, ignore mismatch."

That means a real chain break can be hidden.
This patch removes those blind spots so the detector is strict and honest.

## Scope

### In scope

1. Remove skip logic from `verifyJournalIntegrity`.
2. Remove "documented issues" query/branching from the verifier.
3. Keep core hash-chain checks unchanged (monotonic sequence, previous hash continuity, current hash recomputation).
4. Update/add tests to reflect strict behavior.
5. Document implementation and verification.

### Out of scope

- Data migration to repair historical broken rows.
- Feature-flagged "legacy compatibility mode."
- UI wording changes in compliance screens.

## Design choices

1. **Strict by default**
   - A verifier should be deterministic and conservative: any mismatch is an error.

2. **No hidden exceptions**
   - Remove hard-coded sequence and correction-type bypasses from verification logic.

3. **Minimal algorithmic change**
   - Keep hash recomputation and sequence checks as-is to reduce regression risk.
   - Only remove suppression layers.

## Step-by-step strategy

### Step 1 - Tighten verifier logic

File: `MuseBar/backend/src/models/legalJournal/journalSigning.ts`

Plan:
- Delete documented-issues query and related branches.
- Remove `sequence_number === 128` and `CORRECTION` skip checks.
- Always push mismatch errors when:
  - `previous_hash` is not expected,
  - recomputed `current_hash` does not match stored hash.
- Keep return contract: `{ isValid, errors }`.

### Step 2 - Update regression tests

File: `MuseBar/backend/src/models/legalJournal/journalSigning.integrity.test.ts`

Plan:
- Update existing tests to new query count (single query for entries).
- Add test proving strictness:
  - corrupted chain containing `CORRECTION` transaction does not bypass errors.

### Step 3 - Verify

Run:
- targeted verifier tests,
- backend type-check,
- lint diagnostics on edited files.

## Acceptance criteria

1. Verifier no longer contains hard-coded or correction-based skip logic.
2. Any chain mismatch yields `isValid: false`.
3. Tests pass with strict behavior.
4. Plan + implementation patch notes are added.

## Risks and mitigations

- Risk: historical data may now show integrity failures where it previously passed.
  - Mitigation: this is expected and desired for truthful reporting; remediation of legacy entries can be handled in a separate patch.
