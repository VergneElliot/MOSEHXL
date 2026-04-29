# 177 - P0-L4 (Closure to Legal Journal Wiring) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/176-P0-L4-CLOSURE-TO-LEGAL-JOURNAL-WIRING-PLAN.md`

## What was implemented

This patch removes the dead-code status of `logClosure` by wiring closure-bulletin creation routes to append `CLOSURE` entries in the legal journal stream.

---

## 1) Exposed `logClosure` on `LegalJournalModel`

Updated:
- `MuseBar/backend/src/models/legalJournal/index.ts`

Changes:
- Added `LegalJournalModel.logClosure(...)` proxy that delegates to `JournalOperations.logClosure(...)`.

Result:
- Route/service layers using `LegalJournalModel` can now append closure entries without importing `JournalOperations` directly.

---

## 2) Wired closure routes to append legal-journal closure entries

Updated:
- `MuseBar/backend/src/routes/legal/closure.ts`

Changes:
- Added route-local helper `appendClosureJournalEntry(...)`:
  - normalizes `total_amount` / `total_vat`,
  - appends `CLOSURE` legal-journal entries via `LegalJournalModel.logClosure(...)`,
  - includes closure metadata:
    - `closure_bulletin_id`,
    - `closure_type`,
    - `period_start` / `period_end`,
    - `closure_hash`,
    - `first_sequence` / `last_sequence`,
    - `force`.
- Called helper after closure bulletin creation in:
  - `POST /closure/daily`
  - `POST /closure/weekly`
  - `POST /closure/monthly`
  - `POST /closure/annual`
  - `POST /closure/create` (generic endpoint)

Failure behavior in this patch:
- If closure journal append fails, route logs a strong error with context and keeps closure response successful.
- This is intentional for now because closure bulletins are immutable once inserted and there is no safe compensating-delete path in current architecture.

Result:
- Closure creation now writes into the legal journal stream (when journal append succeeds),
- `logClosure` is no longer dead code.

---

## 3) Added regression coverage for wiring

Updated:
- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Changes:
- Extended mocked legal-journal API to include:
  - `createDailyClosure/createWeeklyClosure/createMonthlyClosure/createAnnualClosure`
  - `logClosure`
- Added allow-path test:
  - `POST /closure/create` with `access_closure`,
  - asserts `createDailyClosure(...)` is called with scoped args,
  - asserts `logClosure(...)` is called with closure metadata payload and correct actor id.

Result:
- Route-level tests enforce that closure creation now attempts legal-journal closure append.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/legal/legalArchiveClosure.permissions.test.ts` ✅
   - Result: 1 file passed, 18 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `models/legalJournal/index.ts`
     - `routes/legal/closure.ts`
     - `routes/legal/legalArchiveClosure.permissions.test.ts`
     - `176-P0-L4-...-PLAN.md`

---

## Outcome

P0-L4 is implemented:

- closure routes now append `CLOSURE` entries to the legal journal stream,
- `logClosure` is active and covered by regression tests,
- closure flow behavior remains stable for operators.

Follow-up (separate patch scope):
- design a transactional strategy to make bulletin + closure-journal append strongly atomic.
