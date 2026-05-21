# 294 — P3-S7 HIBP k-anonymity password check (plan)

## Objective

Integrate an optional HaveIBeenPwned k-anonymity password breach check across password-setting flows.

## Scope

### In scope

- Add shared async password validator that layers HIBP k-anonymity on top of existing password policy.
- Make the breach check configurable via environment variables.
- Enforce on password set/reset/change flows used in auth/account onboarding paths.
- Add regression tests for breached-password rejection and fail-open behavior when the HIBP API is unavailable.

### Out of scope

- Mandatory always-on external password intelligence (this remains opt-in).
- Local breach corpus hosting.

## Design decisions

1. Existing static policy remains first-line validation.
2. HIBP check is enabled only when `PASSWORD_BREACH_CHECK_ENABLED=true`.
3. Network/API errors fail-open (optional control), but compromised matches fail-closed.
4. Integration happens in shared validation and route/model paths that set passwords.

## Verification plan

- Backend type-check.
- Targeted tests for validation utility and affected routes.
- Full backend suite regression run.
