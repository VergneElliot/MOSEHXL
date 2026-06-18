# 192 - P1-S1 (Concurrent Refresh Serialization) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S1)

## Why this patch exists

The audit flagged refresh-token rotation concurrency:

- `POST /api/auth/refresh` can be hit concurrently for the same authenticated user.
- Without per-user serialization, rotation and revocation steps can race and produce
  inconsistent session behavior.

The recommended fix is explicit DB-level serialization with:

- `pg_advisory_xact_lock(user_id)` around refresh rotation.

## Beginner-friendly framing

Think of refresh as "replace old badge with a new badge."
If two workers do this at the same time for the same person, one can revoke while
the other still reads stale state. We add a lock so only one refresh runs at once
for the same user id.

## Scope

### In scope

1. Wrap `POST /api/auth/refresh` critical section in a DB transaction.
2. Acquire transaction-scoped advisory lock keyed by `user_id`.
3. Keep existing behavior (role re-fetch, token issue, audit, revoke current token).
4. Add regression tests proving lock/transaction is used.
5. Document implementation and verification.

### Out of scope

- Global "single active session" policy (P1-S2).
- Refresh endpoint contract changes.

## Design choices

1. **Transaction-scoped advisory lock**
   - `pg_advisory_xact_lock` auto-releases on COMMIT/ROLLBACK.
   - No cleanup table required.

2. **Per-user lock key**
   - Lock key is authenticated `user_id`.
   - Different users can refresh in parallel; same user is serialized.

3. **Minimal blast radius**
   - Apply only inside refresh route.
   - Keep token generation/revocation logic unchanged.

## Strategy

### Step 1 - Route hardening

File:
- `MuseBar/backend/src/routes/authLogin.ts`

Plan:
- Open transaction with a dedicated client.
- `SELECT pg_advisory_xact_lock($1::bigint)` before rotation operations.
- Commit on success; rollback on any failure.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/authLogin.refreshRotation.test.ts`

Plan:
- Mock `pool.connect` + client query lifecycle.
- Assert BEGIN -> advisory lock -> COMMIT path executes.
- Preserve existing revocation expectation.

### Step 3 - Verification

Run:
- target refresh rotation test,
- related auth tests sanity check,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. Refresh path acquires advisory xact lock per user.
2. Transaction boundaries are explicit and safe.
3. Existing refresh behavior still works.
4. Tests prove lock usage and pass.
