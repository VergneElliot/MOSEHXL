# 292 — P3-S6 account lockout and admin unlock (plan)

## Objective

Add account lockout controls after repeated failed logins and provide a secure admin unlock path to restore access.

## Scope

### In scope

- Persist lockout state in `users` table (failed attempts, lock counter, lock expiry).
- Enforce lockout in `/api/auth/login`.
- Implement progressive lock durations for repeated lockouts.
- Add establishment-scoped admin unlock endpoint.
- Add regression tests for lockout and unlock behavior.

### Out of scope

- 2FA / step-up auth.
- Breach-password checks.
- User self-service unlock workflows.

## Design decisions

1. Lockout is DB-backed so it works across processes and restarts.
2. Threshold is configurable (default: 5 failed attempts).
3. Lockout duration grows exponentially by lockout count (base 15 minutes, capped).
4. Successful login clears failed-attempt and lock-expiry state.
5. Unlock is restricted to user managers inside the same establishment scope.

## Verification plan

- Backend type-check.
- Targeted auth route tests for lockout and unlock.
- Full backend test suite.
