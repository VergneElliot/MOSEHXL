# 264 - P3-L1 (Auto-closure must append CLOSURE to legal journal) - Plan

Date: 2026-05-20  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L1)

## Why this patch exists

`ClosureScheduler.executeAutomaticClosureForEstablishment()` creates the daily
closure bulletin via `LegalJournalModel.createDailyClosure(...)` and writes
an `AUTO_CLOSURE_EXECUTED` row to the audit trail, but it **never appends a
`CLOSURE` entry to the legal journal**.

Effect: any day closed by the scheduler instead of by a human leaves the
legal journal stream with a gap between the last `SALE` of the business day
and the next day's events. The closure bulletin row exists in
`closure_bulletins` with `total_amount` and a `closure_hash`, but there is
no matching `legal_journal.transaction_type = 'CLOSURE'` row binding it
into the hash chain. This is a NF525 Inaltérabilité/Conservation gap and a
fiscal inspector-blocking finding.

The manual closure route (`routes/legal/closure.ts`) already calls
`LegalJournalModel.logClosure(...)` via the local helper
`appendClosureJournalEntry(...)` immediately after
`createDailyClosure(...)`. The auto scheduler must do the equivalent.

## Scope

### In scope

1. After a successful `createDailyClosure` in the scheduler, append a
   `CLOSURE` entry to the legal journal with the same payload shape used
   by the manual route (`closure_bulletin_id`, `closure_type`,
   `period_start`, `period_end`, `closure_hash`, `first_sequence`,
   `last_sequence`, `force: false`).
2. On journal append failure: log via the structured logger AND record an
   `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` row in the audit trail so the
   failure is visible to operators (there is no human in the loop for the
   auto path).
3. Preserve current behavior for the idempotent "already exists" branch
   (return `null`, do **not** append).
4. Add regression tests that lock the new behavior.

### Out of scope

- **Atomicity of bulletin + journal append.** Today the manual route also
  swallows journal-append errors after bulletin creation succeeds; making
  the two paths transactional is **P3-L2** and will be done next.
- Changing the closure hash payload, journal entry schema, or any other
  manual closure route behavior.
- Software events / archive route fixes (separate P0/P1 items).

## Strategy

### Step 1 - Wire the journal append in the auto path

In `MuseBar/backend/src/utils/closureScheduler.ts`,
`executeAutomaticClosureForEstablishment(establishmentId, now)`:

1. Keep the existing `createDailyClosure(...)` call and the "already
   exists" idempotency branch unchanged.
2. After `createDailyClosure(...)` succeeds, call
   `LegalJournalModel.logClosure(establishmentId, 'DAILY', totalAmount,
   totalVat, closureData)` where:
   - `totalAmount`/`totalVat` are parsed from the returned bulletin
     (`closureBulletin.total_amount`, `closureBulletin.total_vat`) with
     the same `Number.isFinite` fallback the manual route uses.
   - `closureData` includes `closure_bulletin_id`, `closure_type: 'DAILY'`,
     `period_start`, `period_end`, `closure_hash`, `first_sequence`,
     `last_sequence`, `force: false`, plus `trigger: 'AUTOMATIC'` to
     distinguish auto vs manual closures in the journal payload.
   - `userId` is `undefined` (system-triggered).
3. Wrap the `logClosure` call in try/catch:
   - Log the error via `Logger.getInstance().error(...)` with category
     `LEGAL_JOURNAL`.
   - Append an `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit row with the
     bulletin id, establishment id, error message, and closure time.
   - Do **not** rethrow — the bulletin already exists and the deeper
     atomicity rework is P3-L2.
4. After a successful journal append, keep the existing
   `AUTO_CLOSURE_EXECUTED` audit row exactly as-is. Optionally enrich its
   `action_details` with `journal_sequence_number` from the returned
   journal entry, since the manual route does not expose this either and
   the value is operationally useful.

### Step 2 - Add regression tests

New file: `MuseBar/backend/src/utils/closureScheduler.test.ts`.

Cover at minimum:

1. **Happy path:** `createDailyClosure` resolves → `logClosure` is called
   exactly once with the expected `(establishmentId, 'DAILY',
   totalAmount, totalVat, closureData)` shape; `AUTO_CLOSURE_EXECUTED`
   audit row is recorded.
2. **"Already exists" idempotency:** `createDailyClosure` throws an Error
   whose message includes `'already exists'` → returns `null`, `logClosure`
   is **not** called, no `AUTO_CLOSURE_EXECUTED` audit row.
3. **Journal append failure:** `createDailyClosure` resolves but
   `logClosure` rejects → function returns the `{ establishmentId,
   bulletinId }` result (not rethrown), an `AUTO_CLOSURE_JOURNAL_APPEND_FAILED`
   audit row is recorded with the bulletin id and error message, and
   `AUTO_CLOSURE_EXECUTED` is still recorded.
4. **`createDailyClosure` failure (non-"already exists"):** unchanged
   behavior — `AUTO_CLOSURE_FAILED` audit row is recorded and the error
   is rethrown; `logClosure` is **not** called.

All tests mock `pool`, `LegalJournalModel.createDailyClosure`,
`LegalJournalModel.logClosure`, and `AuditTrailModel.logAction` via the
existing Vitest mocking patterns used elsewhere in the backend
(`vi.mock('../app', …)`, `vi.mock('../models/legalJournal', …)`,
`vi.mock('../models/auditTrail', …)`).

### Step 3 - Verify

1. `npm run type-check` in `MuseBar/backend` → pass.
2. `npx vitest run src/utils/closureScheduler.test.ts` → pass.
3. `ReadLints` on touched files → no new issues.

## Acceptance criteria

1. After this patch, every successful auto daily closure produces both a
   `closure_bulletin` row and a matching `legal_journal` `CLOSURE` row.
2. The journal payload includes `trigger: 'AUTOMATIC'` so manual vs auto
   closures can be distinguished downstream.
3. Journal append failures during auto closure are recorded as
   `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit rows.
4. The "already exists" idempotent branch is unchanged.
5. Tests lock all four behaviors above.
