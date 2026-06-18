# 236 - P2-S17 (refresh rememberMe consistency) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S17)

## Why this patch exists

Frontend refresh currently calls `POST /api/auth/refresh` without body, so the
backend receives `rememberMe` as falsy and reissues shorter-lifetime tokens even
for remembered sessions.

This breaks session-duration consistency after the first refresh cycle.

## Scope

### In scope

1. Send `rememberMe` in frontend refresh requests.
2. Keep refresh behavior consistent with stored remember-me preference.
3. Add focused hook tests for request payload behavior.
4. Document implementation and verification.

### Out of scope

- Backend token-expiry policy changes.
- Cookie-based session redesign.

## Design choices

1. **State-first, storage-fallback**
   - Use hook state `rememberMe` as primary source.
   - Fall back to `localStorage.remember_me` to avoid transient mismatch windows.

2. **Refresh response alignment**
   - Accept optional `expiresIn` from refresh response and persist it to state/storage.
   - Keeps refresh cadence aligned with actual issued token lifetime.

3. **Small isolated tests**
   - Test hook-level request payload, not full auth UI flow.

## Strategy

### Step 1 - Hook update

File:
- `MuseBar/src/hooks/useAuth.ts`

Plan:
1. Include `{ rememberMe }` in `/auth/refresh` payload.
2. Derive payload flag from state with localStorage fallback.
3. Persist `expiresIn` from refresh response when provided.

### Step 2 - Regression tests

File:
- `MuseBar/src/hooks/__tests__/useAuth.test.ts` (new)

Plan:
1. Assert remembered session sends `rememberMe: true` on refresh.
2. Assert localStorage fallback sends `rememberMe: true` when state is not yet set.

### Step 3 - Verify

Run:
- targeted frontend hook test,
- lint diagnostics on touched files.

## Acceptance criteria

1. Refresh call includes explicit `rememberMe` intent.
2. Remembered sessions keep requesting 7-day refresh cadence.
3. Hook tests cover and lock payload behavior.
