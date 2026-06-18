# 362 - P3-S14 (invitation accept token log redaction follow-up) - Plan

## Context

A delta security audit found a cleartext invitation token leak in route-level error metadata:

- `routes/userManagement/invitationRoutes.ts` logged `token: req.body.token` in the invitation accept catch path.

Even with broader logger redaction work completed under P3-S14, this direct route metadata still leaked raw token value before sanitization guarantees could be relied on.

## Goal

Remove raw invitation token values from invitation-accept error logs while keeping useful operational diagnostics.

## Planned change

- Replace `token: req.body.token` with a safe diagnostic field:
  - `token_present: boolean`

This preserves debugging signal (token submitted vs absent) without exposing secrets.

## Verification

- Backend type-check (`npm run type-check`)
- Lint diagnostics for `invitationRoutes.ts`
