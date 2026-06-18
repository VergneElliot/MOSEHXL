# 176 - P0-L4 (Closure to Legal Journal Wiring) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L4)

## Why this patch exists

The audit found that closure bulletins are created and signed, but closure events are not appended to the legal journal stream:

- `JournalOperations.logClosure(...)` exists,
- but it has no active callers.

This creates a traceability gap: closure actions are not represented in the same append-only signed journal stream as sales/refunds/changes.

## Beginner-friendly framing

Today, the system does:

1. creates a closure bulletin (`closure_bulletins`),
2. returns success.

But it forgets to write the matching legal journal "closure event".
So one part of accounting says "closure happened" while the journal chain says nothing about it.

This patch wires those two together.

## Scope

### In scope

1. Expose `logClosure` on `LegalJournalModel` compatibility layer.
2. In closure routes, append a `CLOSURE` legal journal entry after a closure bulletin is created.
3. Include minimal closure metadata in the journal payload (`closure_bulletin_id`, type, period, hash, sequence range).
4. Add route-level regression test proving journal append is invoked.
5. Document implementation and verification.

### Out of scope

- Full transactional rewrite guaranteeing perfect atomicity between bulletin insert and journal insert.
- Scheduler/auto-closure flow redesign.
- Archive export side-effect redesign.

## Design choices

1. **Route-level wiring now**
   - Closure creation currently flows through `routes/legal/closure.ts`.
   - Wiring there gives immediate coverage with minimal blast radius.

2. **Non-blocking journal append for this patch**
   - Because closure bulletins are immutable once inserted and there is no safe compensating delete path,
     making journal append hard-fail could produce confusing retry/duplicate-period behavior.
   - For this patch, closure creation remains successful even if journal append fails; failures are logged with strong context.
   - A later transactional redesign can enforce strict atomicity.

3. **Shared helper for consistency**
   - Add one helper in `closure.ts` to avoid copy/paste for daily/weekly/monthly/annual/create endpoints.

## Step-by-step strategy

### Step 1 - Expose `logClosure`

File: `MuseBar/backend/src/models/legalJournal/index.ts`

Plan:
- Add `LegalJournalModel.logClosure(...)` proxy method to call `JournalOperations.logClosure(...)`.

### Step 2 - Wire closure routes

File: `MuseBar/backend/src/routes/legal/closure.ts`

Plan:
- Add helper `appendClosureJournalEntry(...)`.
- Call helper after successful closure creation in:
  - `/daily`
  - `/weekly`
  - `/monthly`
  - `/annual`
  - `/create` (generic endpoint)
- Payload should include:
  - `closure_bulletin_id`
  - `closure_type`
  - `period_start` / `period_end`
  - `closure_hash`
  - `first_sequence` / `last_sequence`
  - `force` flag

### Step 3 - Tests

File: `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Plan:
- Extend legal-journal mock with `logClosure`.
- Add allow-path test for `/closure/create` with `access_closure` asserting:
  - closure creation path is called,
  - `logClosure` receives expected establishment/type/totals metadata.

### Step 4 - Verify

Run:
- targeted legal route tests,
- backend type-check,
- lint diagnostics for edited files.

## Acceptance criteria

1. `logClosure` is no longer dead code.
2. Closure routes append `CLOSURE` entries with useful metadata.
3. Existing closure create responses remain intact.
4. Regression test proves wiring.
5. Plan + implementation patch notes are added.

## Risks and mitigations

- Risk: journal append failure after bulletin creation.
  - Mitigation: explicit error logging with closure id/type context; keep closure success response stable for now.
- Risk: duplicate wiring in future services.
  - Mitigation: use single helper function and route test.
