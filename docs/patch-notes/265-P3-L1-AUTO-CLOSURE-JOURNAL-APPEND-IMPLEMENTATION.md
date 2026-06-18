# 265 - P3-L1 (Auto-closure must append CLOSURE to legal journal) - Implementation

Date: 2026-05-20  
Related plan: `docs/patch-notes/264-P3-L1-AUTO-CLOSURE-JOURNAL-APPEND-PLAN.md`

## What changed

Updated:

- `MuseBar/backend/src/utils/closureScheduler.ts`

`ClosureScheduler.executeAutomaticClosureForEstablishment(...)` now appends
a matching `CLOSURE` entry to the legal journal after every successful
`createDailyClosure(...)`. The append is done via
`LegalJournalModel.logClosure(...)` with the same payload shape used by the
manual `/api/legal/closure/daily` route, plus an extra `trigger:
'AUTOMATIC'` field so manual vs auto closures can be distinguished in the
journal payload.

Effective sequence per successful auto closure:

1. `createDailyClosure(...)` → bulletin row in `closure_bulletins`.
2. `LegalJournalModel.logClosure(establishmentId, 'DAILY', totalAmount,
   totalVat, closureData)` → row in `legal_journal` with
   `transaction_type = 'CLOSURE'` and the full hash chain binding.
3. `AUTO_CLOSURE_EXECUTED` audit row, now enriched with
   `journal_sequence_number` so operators can correlate bulletin and
   journal entry.

Total / VAT amounts are parsed through a small `toFiniteNumber(...)` helper
to match the manual route's `Number.isFinite` fallback (the bulletin
columns are `NUMERIC` and come back from `pg` as strings).

On journal append failure (only):

- The error is logged via `Logger.getInstance().error(..., 'LEGAL_JOURNAL')`.
- An `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit row is written with
  `bulletin_id`, `establishment_id`, `closure_time`, and the error message.
- The function does **not** rethrow. The bulletin already exists in
  `closure_bulletins` and the deeper bulletin+journal atomicity rework is
  scheduled under **P3-L2** (next item in the audit queue).

The `'already exists'` idempotency branch is unchanged: when the same
business day's bulletin already exists, `executeAutomaticClosureForEstablishment`
still returns `null` without attempting any journal append.

Non-`'already exists'` `createDailyClosure` failures continue to record
`AUTO_CLOSURE_FAILED` and rethrow (unchanged).

## Why this resolves P3-L1

Before this patch, the auto path called `createDailyClosure` and only
wrote to `audit_trail`. That left a hole in the immutable legal journal
hash chain for every day closed by the scheduler — a NF525 Inaltérabilité
gap and a fiscal inspector-blocking finding. The append now happens on
the same path the manual route uses, so the journal stream is identical
regardless of whether a human or the scheduler triggered the closure.

`P3-L1` is intentionally scoped narrowly: it wires the journal append.
Strict bulletin+journal atomicity (so a journal failure rolls back the
bulletin) is `P3-L2`.

## Regression coverage added

Added:

- `MuseBar/backend/src/utils/closureScheduler.test.ts`

Covers four behaviors:

1. **Happy path:** `createDailyClosure` resolves → `logClosure` is called
   exactly once with the expected `(establishmentId, 'DAILY', totalAmount,
   totalVat, closureData)` shape, including `force: false` and
   `trigger: 'AUTOMATIC'`; `AUTO_CLOSURE_EXECUTED` audit row carries
   `journal_sequence_number` from the journal entry; no failure audit row;
   logger is not called.
2. **"Already exists" idempotency:** `createDailyClosure` rejects with
   `'Daily closure bulletin already exists for this period'` → returns
   `null`, `logClosure` is not called, neither `AUTO_CLOSURE_EXECUTED` nor
   `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit rows are recorded.
3. **Journal append failure:** `createDailyClosure` resolves but
   `logClosure` rejects → the function still resolves to
   `{ establishmentId, bulletinId }`, `Logger.error(..., 'LEGAL_JOURNAL')`
   is called once with the bulletin id, an
   `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit row is recorded with
   `bulletin_id`, `establishment_id`, and the error message, and
   `AUTO_CLOSURE_EXECUTED` is still recorded with
   `journal_sequence_number: null`.
4. **`createDailyClosure` failure (non-"already exists"):** the function
   rethrows, `logClosure` is not called, and `AUTO_CLOSURE_FAILED` is
   recorded with the error message.

## Verification

Executed:

1. `npm run type-check` -> pass.
2. `npx vitest run src/utils/closureScheduler.test.ts` -> 4/4 pass.
3. Lint diagnostics on touched files -> no issues.

A full `npx vitest run` shows 10 pre-existing test-file failures unrelated
to this change (`auth.permission`, `softwareEventJournal.runtime`,
`legalArchiveClosure.permissions`, several `orderAudit` / `orderLegal` /
`orderPayment` / `orderCRUD` / `printing.routes` files). Those were
verified to fail identically without this patch and will be triaged
separately — they are not regressions caused by P3-L1.

## Result

P3-L1 is satisfied: every successful auto daily closure now produces both
a `closure_bulletin` row and a matching `legal_journal` `CLOSURE` row,
journal append failures are visible in the audit trail and structured
logs, and the existing idempotent and failure paths are unchanged.
