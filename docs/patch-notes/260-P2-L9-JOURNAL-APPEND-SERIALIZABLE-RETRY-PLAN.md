# 260 - P2-L9 (journal append serializable + retry) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L9)

## Why this patch exists

Legal journal append currently does multiple reads/writes (`next sequence`,
`last hash`, `insert`) without an explicit serializable transaction retry loop.

Under concurrent writes, this can create race pressure on sequence/hash chain
construction and relies on best-effort behavior rather than explicit contention
handling.

## Scope

### In scope

1. Make journal append execution transactional with `SERIALIZABLE` isolation.
2. Add retry loop for retryable transaction failures (`40001`, `40P01`).
3. Keep external API contract unchanged (`JournalOperations.addEntry`, etc.).
4. Add regression tests for retry behavior.

### Out of scope

- Redesign of journal table schema.
- Closure bulletin logic changes.
- Route/service behavioral changes.

## Strategy

### Step 1 - Transactional append primitive

Add a dedicated append method in `JournalQueries` that, within a single DB
transaction:

1. begins transaction + sets `SERIALIZABLE`,
2. reads last sequence and previous hash for establishment,
3. computes current hash from in-transaction values,
4. inserts journal entry,
5. commits.

### Step 2 - Retry policy

Wrap append attempt in bounded retries:
1. retry on `40001` (serialization failure),
2. retry on `40P01` (deadlock detected),
3. rollback + release client on each failed attempt.

### Step 3 - Wire public operation

Refactor `JournalOperations.addEntry` to delegate to the new transactional append
method so all append call sites benefit automatically.

### Step 4 - Verification

1. Add tests validating retry success and retry exhaustion behavior.
2. Run legal journal targeted tests + backend type-check.

## Acceptance criteria

1. Journal append is performed in a serializable transaction.
2. Retryable transaction conflicts are retried automatically.
3. Hash chain/sequence values are built from one transaction context.
