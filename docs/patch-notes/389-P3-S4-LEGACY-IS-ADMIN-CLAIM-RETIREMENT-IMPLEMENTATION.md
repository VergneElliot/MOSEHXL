# 389 - P3-S4 (legacy `is_admin` claim retirement) - Implementation

Plan reference: `docs/patch-notes/388-P3-S4-LEGACY-IS-ADMIN-CLAIM-RETIREMENT-PLAN.md`

## What was implemented

This patch completes runtime retirement of the legacy JWT `is_admin` claim while adding operational metrics to confirm rollout status.

### 1) Runtime admin authority is now role-only

Updated `MuseBar/backend/src/middleware/auth.ts`:

- `requireAuth` no longer derives admin authority from `payload.is_admin`.
- `req.user.is_admin` is now derived strictly from canonical role:
  - `payload.role === 'system_admin'`.

This finalizes runtime separation between legacy boolean claim and canonical role model.

### 2) Legacy claim detection + metrics added

Updated `auth.ts` with in-memory retirement telemetry:

- Added metric state:
  - `seenCount`
  - `rejectedCount`
  - `lastSeenAt`
  - `lastRejectedAt`
- Added helpers:
  - `getLegacyAdminClaimMetrics()`
  - `resetLegacyAdminClaimMetrics()`
- When a token contains legacy `is_admin`:
  - metrics are incremented,
  - `LEGACY_IS_ADMIN_CLAIM_DETECTED` security event is emitted (best-effort).

### 3) Policy-controlled rejection path

Updated `auth.ts` policy logic:

- Introduced env-controlled rejection policy:
  - `AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM=true|false`
- Default behavior when env is unset:
  - reject in production,
  - allow (with metrics) outside production.
- When rejection is active and legacy claim is present:
  - request fails with `401` (`Token uses retired legacy admin claim`),
  - rejection metrics are updated.

### 4) Admin visibility endpoint

Updated `MuseBar/backend/src/routes/authLogin.ts`:

- Added `GET /api/auth/legacy-claim-metrics`:
  - protected by `requireAuth` + `requireAdmin`,
  - returns metric snapshot and effective rejection policy state.

### 5) Environment validation + template

Updated:

- `MuseBar/backend/src/config/environment.ts`
  - validates `AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM` as boolean string.
- `MuseBar/backend/.env.example`
  - documents the new policy variable and defaults.

### 6) Tests

Added:

- `MuseBar/backend/src/middleware/auth.legacyClaim.test.ts`
  - allow+track path (`AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM=false`),
  - reject path (`AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM=true`),
  - production default reject when env unset.

### 7) Audit truth sync

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

to mark P2-S16 sub-task 9 as landed and update current token hardening state.

## Verification executed

From `MuseBar/backend`:

- `npm test -- src/middleware/auth.legacyClaim.test.ts src/routes/authLogin.refreshRotation.test.ts` -> pass
- `npm run type-check` -> pass

## Outcome

Legacy `is_admin` claim is now retired from runtime authority decisions, with explicit detection/rejection controls and measurable operational metrics to prove retirement progress.
