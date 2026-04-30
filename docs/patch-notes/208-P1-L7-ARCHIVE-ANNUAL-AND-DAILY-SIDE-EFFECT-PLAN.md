# 208 - P1-L7 (ArchiveService ANNUAL + DAILY side-effect removal) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-L7)

## Why this patch exists

Audit P1-L7 flagged two issues in archive generation:

1. `ArchiveService.generateExportContent(...)` has no `ANNUAL` branch, even though
   `ANNUAL` is a valid export type in API and DB constraints.
2. `DAILY` export currently calls `LegalJournalModel.createDailyClosure(...)`, which
   mutates fiscal state as a side effect of export.

Export must be read-oriented. Closure creation should stay in dedicated closure flows.

## Scope

### In scope

1. Add a real `ANNUAL` content path in `generateExportContent`.
2. Refactor `DAILY` export to read existing journal data (no closure creation).
3. Keep existing output format support (`JSON`, `XML`, `CSV`, `PDF` placeholder) intact.
4. Add regression tests to lock the behavior.
5. Document implementation and verification.

### Out of scope

- Implementing real PDF rendering (`P1-L8`).
- Enabling `/api/legal/archive/:id/export` endpoint (currently intentionally `501`).
- Archive route contract redesign.

## Design choices

1. **No side effects during export**
   - Replace `createDailyClosure` call with pure reads:
     - `getEntriesForPeriod(...)`
     - `getClosureBulletins(..., 'DAILY')` for optional matching bulletin metadata.

2. **Consistent period normalization**
   - `DAILY`: normalize to full day boundaries (`00:00:00.000` to `23:59:59.999`).
   - `ANNUAL`: derive full calendar year from `period_start`.

3. **Sales-focused summary parity**
   - Keep summary shape aligned with existing monthly logic:
     - `total_transactions`, `total_amount`, `total_vat` based on `SALE` entries.

4. **Backward-safe output extension**
   - Extend CSV conversion with an `ANNUAL` branch (same summary columns).

## Strategy

### Step 1 - Service behavior update

File:
- `MuseBar/backend/src/models/archiveService.ts`

Plan:
1. Remove `DAILY` call to `createDailyClosure`.
2. Build `DAILY` payload from legal journal read queries only.
3. Add missing `ANNUAL` branch with yearly period, sales summary, and optional closure match.
4. Extend CSV serializer to include `ANNUAL`.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/models/archiveService.generateExportContent.test.ts` (new)

Plan:
1. Assert `DAILY` export does not call `createDailyClosure`.
2. Assert `ANNUAL` export returns expected type and year boundaries.
3. Assert summary fields are populated from legal journal entries.

### Step 3 - Verify

Run:
- targeted archive service tests,
- legal archive route permission test sanity (to ensure no incidental regression),
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. `ANNUAL` export no longer falls through to empty payload.
2. `DAILY` export no longer creates closure bulletins as side effect.
3. Regression tests fail if either behavior regresses.
