# 297 — P3-L8 closure bulletin vs journal SALE reconciliation (implementation)

## What changed

### 1) Persisted reconciliation fields on closure bulletins

- Added migration:
  - `MuseBar/backend/src/migrations/files/2026_05_21_20_20_00_add_closure_journal_reconciliation_columns.sql`
- Added new columns to `closure_bulletins`:
  - `journal_sales_count`
  - `journal_sales_amount`
  - `journal_sales_vat`
  - `reconciliation_ok`
  - `reconciliation_details` (JSONB)
- Updated bootstrap schema mirror:
  - `MuseBar/backend/src/models/legal-schema.sql`

### 2) Journal SALE summary query

- Added `JournalQueries.getSaleSummaryForPeriod(...)` in:
  - `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
- Query is tenant-scoped and period-scoped, with `transaction_type = 'SALE'`.

### 3) Reconciliation computed during closure creation

- Updated:
  - `MuseBar/backend/src/models/legalJournal/closureOperations.ts`
- Both daily and generic period closure paths now:
  - compute closure totals (existing behavior),
  - fetch legal journal SALE summary,
  - compute deltas and reconciliation status,
  - persist reconciliation snapshot on closure bulletin insert.

### 4) Closure insert contract extended

- Updated:
  - `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
  - `MuseBar/backend/src/models/legalJournal/types.ts`
- `insertClosureBulletin(...)` now stores reconciliation fields.

## Verification

- Backend type-check: `npm run type-check` ✅
- Closure-related regression tests:
  - `src/routes/legal/legalArchiveClosure.permissions.test.ts` ✅
  - `src/utils/closureScheduler.test.ts` ✅
- Full backend suite: `npx vitest run` (`51/51` files, `202/202` tests) ✅
- Migration applied:
  - `npm run migration:migrate` ✅ (`add closure journal reconciliation columns`)

## Notes

- This closes P3-L8: closure bulletins now include explicit evidence when order-derived closure totals diverge from legal journal `SALE` aggregates.
