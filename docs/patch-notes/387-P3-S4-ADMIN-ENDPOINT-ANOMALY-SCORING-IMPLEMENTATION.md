# 387 - P3-S4 (admin endpoint anomaly scoring) - Implementation

Plan reference: `docs/patch-notes/386-P3-S4-ADMIN-ENDPOINT-ANOMALY-SCORING-PLAN.md`

## What was implemented

This patch upgrades session anomaly telemetry from simple boolean drift logging to scored risk signaling for admin-sensitive auth flows.

### 1) Scored anomaly framework added in auth route layer

Updated `MuseBar/backend/src/routes/authLogin.ts`:

- Added normalized user-agent helper: `normalizeUserAgent(...)`.
- Added drift model and comparison:
  - `computeSessionDrift(...)` over:
    - `client_id`
    - `ip_subnet`
    - `user_agent`
- Added scoring model:
  - base drift weights:
    - client id change: `+45`
    - IP subnet change: `+30`
    - user agent change: `+20`
  - admin-sensitive context bump: `+15`
- Added severity mapping:
  - `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Added shared emission helper:
  - `logSessionAnomalySignal(...)` (best-effort logger path).

### 2) Refresh anomaly signal now role-aware and severity-scored

Updated refresh flow in `authLogin.ts`:

- Existing refresh anomaly signal was moved to run after role derivation.
- New `logRefreshSessionAnomalySignal(...)` now includes:
  - endpoint metadata (`auth.refresh`),
  - user role,
  - admin-sensitive weighting for admin roles.
- Refresh token persistence now uses normalized user-agent for consistency.

### 3) Admin endpoint anomaly signal added for support impersonation actions

Updated admin routes in `authLogin.ts`:

- `POST /api/auth/support/impersonation/start`
- `POST /api/auth/support/impersonation/stop`

Both now:

- resolve current client fingerprint (`client session id`, `ip subnet`, `user agent`),
- compare against latest active refresh-session baseline for the same user,
- emit `ADMIN_ENDPOINT_ANOMALY_SIGNAL` with scored severity.

These checks are explicitly non-blocking (best-effort telemetry only).

### 4) Audit state updated

Updated `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`:

- P2-S16 sub-task 8 now marked as follow-up landed.
- Current-state text updated to reflect scored admin anomaly signaling as completed.

## Verification executed

From `MuseBar/backend`:

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts` -> pass
- `npm run type-check` -> pass

## Outcome

Admin-sensitive auth paths now produce structured, scored anomaly signals that are easier to triage operationally, while preserving fail-open behavior for legitimate authentication flows.
