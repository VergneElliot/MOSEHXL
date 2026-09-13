# 505 — PIN session lifetime: match remember-me (IMPLEMENTATION)

## Changes

- `pinActorToken.ts`: hard cap default **30d** (`AUTH_PIN_ACTOR_TTL_DAYS` /
  `AUTH_REFRESH_REMEMBER_DAYS`).
- `staffPinSession.ts`: removed idle timeout from `findActive` / `listActive` /
  `closeStale` (expiry-only stale close).
- `closureCreationService.ts`: daily closure no longer closes open PIN badges.
- Explicit close, PIN/permission change, and account deactivate still revoke badges.

## Verification

- Unit: existing pin session guard / auth tests
- Manual: open PIN → idle > 60 min still active; daily Z does not clear badge tabs
