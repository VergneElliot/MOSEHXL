# 386 - P3-S4 (admin endpoint anomaly scoring) - Plan

## Context

The previous patch added:

- stable session/device metadata (`client_id`, `ip_subnet`, `user_agent`) on refresh sessions,
- authenticated session listing,
- revoke-other-sessions control.

The next remaining roadmap step is operational anomaly signaling for admin-sensitive auth actions, especially when combined with enforced 2FA.

## Goal

Add a consistent anomaly scoring signal for admin-sensitive auth endpoints so security logs can prioritize suspicious behavior without breaking legitimate sessions.

## Planned changes

1. Replace the current boolean-only refresh anomaly signal with scored severity:
   - score from fingerprint drift (`client_id`, `ip_subnet`, `user_agent`),
   - higher weighting on admin-sensitive contexts,
   - severity mapping (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`).
2. Apply scoring to refresh flow:
   - evaluate drift against stored refresh-session metadata,
   - mark admin-sensitive refreshes (admin roles) with stronger scoring.
3. Extend anomaly scoring to support impersonation admin endpoints:
   - compare current request fingerprint against latest active session baseline,
   - emit dedicated security event for anomalous admin action context.
4. Keep all signals best-effort:
   - never block login/refresh/impersonation solely because of anomaly score.
5. Add/adjust tests where needed to ensure existing auth behavior remains stable.

## Verification plan

- `npm test -- src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
- `npm run type-check`

## Expected outcome

Security telemetry becomes more actionable: suspicious admin endpoint behavior is prioritized with explicit score/severity metadata while preserving safe operational continuity for valid sessions.
