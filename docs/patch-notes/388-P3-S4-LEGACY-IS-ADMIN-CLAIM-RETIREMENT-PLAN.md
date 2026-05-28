# 388 - P3-S4 (legacy `is_admin` claim retirement) - Plan

## Context

The token roadmap is almost complete. One final item remains:

- retire legacy JWT claim `is_admin` after rollover TTL,
- add visibility/metrics so we can prove it is no longer used.

Current token issuance already strips `is_admin`, but auth middleware still accepts it when decoding old tokens.

## Goal

Complete retirement of the legacy `is_admin` JWT claim by:

1. making role (`role === system_admin`) the only runtime source of admin authority,
2. detecting + counting legacy-claim usage attempts,
3. optionally rejecting legacy-claim tokens via explicit policy control,
4. exposing lightweight admin metrics for operational follow-up.

## Planned changes

1. **Auth middleware hardening**
   - stop deriving runtime admin from `payload.is_admin`,
   - derive admin strictly from canonical role.
2. **Legacy claim telemetry**
   - detect when decoded token still contains `is_admin`,
   - maintain in-memory metrics:
     - seen count,
     - rejected count,
     - last seen/rejected timestamps,
   - emit security event for detection.
3. **Rejection policy control**
   - add env-driven policy `AUTH_REJECT_LEGACY_IS_ADMIN_CLAIM`,
   - production-safe default behavior,
   - reject with 401 when policy requires hard retirement.
4. **Operational visibility endpoint**
   - add admin-only endpoint to inspect retirement metrics and active policy.
5. **Tests + docs**
   - add focused middleware tests for detect/allow vs detect/reject behavior,
   - update `.env.example`,
   - update audit truth line and patch-note index.

## Verification plan

- `npm test -- src/middleware/auth.legacyClaim.test.ts`
- `npm test -- src/routes/authLogin.refreshRotation.test.ts`
- `npm run type-check`

## Expected outcome

Legacy admin authority through JWT boolean claim is fully retired in runtime auth decisions. Remaining usage (if any) becomes explicitly measurable and enforceable through policy, giving a clean operational end-state.
