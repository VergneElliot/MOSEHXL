# 360 - P3-L2 (auto-closure journal atomicity follow-up) - Plan

## Context

During a fresh delta audit pass, the scheduler path was found to still be non-atomic even though manual closure endpoints were fail-closed:

- `ClosureScheduler.executeAutomaticClosureForEstablishment` created a closed daily bulletin, then attempted `logClosure`.
- On journal append failure it logged `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` and continued, leaving a closure bulletin without matching `CLOSURE` journal entry.

This reopened the same class of legal integrity risk addressed previously for manual routes.

## Goal

Make scheduler auto-closure follow the same fail-closed invariant as manual closure creation:

1. Create an **open** closure bulletin.
2. Append legal journal `CLOSURE`.
3. Finalize bulletin only after successful append.
4. Roll back open bulletin if append fails.

## Planned changes

- Update `closureScheduler.ts` to use:
  - `LegalJournalModel.createDailyClosureOpen(...)`
  - `LegalJournalModel.closeOpenClosureBulletin(...)`
  - `LegalJournalModel.deleteOpenClosureBulletin(...)` on append failure
- Keep `AUTO_CLOSURE_JOURNAL_APPEND_FAILED` audit logging, but rethrow to fail the scheduler run for that establishment.
- Update `closureScheduler.test.ts` to assert fail-closed semantics:
  - no `AUTO_CLOSURE_EXECUTED` on append failure
  - rollback executed on append failure
  - `AUTO_CLOSURE_FAILED` emitted by outer failure path

## Verification

- `npm test -- src/utils/closureScheduler.test.ts` (backend)
- `npm run type-check` (backend)
