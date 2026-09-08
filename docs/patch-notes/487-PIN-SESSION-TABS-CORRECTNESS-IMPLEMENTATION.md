# 487 — Multi-tab PIN session correctness (IMPLEMENTATION)

Slice A of [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md). Frontend only, no schema,
no API change. Fixes defects D1, D2, D3 plus a cart-bleed found while tracing them.

## What was wrong

`PinSessionsContext` held `sessions` and `activeSessionId` as two independent states and mutated
them from the value **captured in each callback's closure**:

```ts
const next = sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
persist(next, activeSessionId);           // absolute write to state + sessionStorage
```

POS persists the cart on every change and the floor hooks call `updateActiveSession` from async
handlers. Any of those firing with a pre-add snapshot rewrote the whole session list and **erased
the tab that had just been opened** — the reported bug. It only reproduced with cart/floor
activity, which is why it looked intermittent.

The leftover `Session : <name>` caption in the header was a status `Typography` that was set on
verify and never cleared, so after the tab was erased the caption was the only trace left,
looking like an unclickable tab.

## Changes

### `src/contexts/pinSessionsState.ts` (new)

Pure, unit-tested transitions over a single state object:

```ts
interface PinSessionsState { sessions: PinSession[]; activeSessionId: string | null }
```

- `addOrFocusSession` — appends, or refreshes and focuses the existing session for that user
- `patchSession` — **no-op when the session is gone**, so a late write cannot resurrect a closed tab
- `dismissSession`, `focusSession` (rejects unknown ids), `resolveSessionId`
- `normalizeState` — validates persisted/legacy payloads, drops unusable entries, repairs dangling focus
- `readTokenExpiryMs` / `withTokenExpiry` / `isActorExpired` — decode `exp` from the PIN actor JWT

Session types (`PinActorState`, `ActiveTableState`, `PinSession`) moved here and are re-exported
from `PinSessionsContext`, so no consumer import changed.

### `src/contexts/PinSessionsContext.tsx`

- One `useState<PinSessionsState>`; **every** mutation is a functional update — a stale caller can
  no longer drop a concurrent session
- Callbacks have stable identity (empty dep arrays), which stops consumer effects from re-firing
  on unrelated session changes
- `sessionStorage` is written from a single effect on committed state instead of inside each action
- `PinActorState.expiresAt` is stamped from the token on add and on load (existing stored tabs
  included), with a 30 s tick exposing `expiredSessionIds` / `activeSessionExpired`

### `src/components/common/PinSessionHeaderTabs.tsx`

- Status caption replaced by an auto-dismissing `Snackbar` (3 s)
- Expired tabs render struck-through with a warning icon and `· expirée`
- Selecting an expired tab opens the PIN pad pre-titled *Session expirée* — re-verifying the same
  PIN refreshes the token in place (dedup by user id) instead of 401-ing silently

### `src/components/POS/POSContainer.tsx`

The load and persist effects run in the same commit on a tab switch: load set the ref to the new
id, then persist wrote the **previous** cart into the newly focused session. Added a one-shot
`skipNextCartPersistRef` guard so the switch commit cannot bleed carts across sessions.

## Verification

- `npx vitest run src/contexts/pinSessionsState.test.ts` — 15 tests, incl. explicit regressions for
  the clobber, late writes after dismiss, 4 concurrent tabs, expiry stamping, payload normalization
- `npx vitest run` (frontend) — 7 files / 48 tests pass
- `npm run type-check --workspace MuseBar` — clean (frontend, backend, bridge)
- Lint clean on all touched files

Manual checks to run on the dev server:

- [ ] Open 4 sessions with carts and an open table each; no tab disappears, switching keeps each cart
- [ ] Confirmation toast auto-dismisses and leaves no dead text in the header
- [ ] Force an expired token (edit `expiresAt` in `sessionStorage`); tab shows `expirée` and prompts re-badge

## Fiscal impact

**PATCH** — no ISCA parameter change; no journal, closure or archive code touched.

## Not in this slice

PIN sessions are still stateless server-side, so journal/audit rows carry no session id. That is
slice B of [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md), along with the
`ActorContext` resolver and dual account/PIN traceability.
