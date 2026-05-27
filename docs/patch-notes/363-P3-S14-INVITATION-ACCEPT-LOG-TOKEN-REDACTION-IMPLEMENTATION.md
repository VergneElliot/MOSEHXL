# 363 - P3-S14 (invitation accept token log redaction follow-up) - Implementation

Plan reference: `docs/patch-notes/362-P3-S14-INVITATION-ACCEPT-LOG-TOKEN-REDACTION-PLAN.md`

## What changed

Updated `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`:

- In the invitation accept error handler, replaced:
  - `token: req.body.token`
- With:
  - `token_present: typeof req.body.token === 'string' && req.body.token.length > 0`

## Why this matters

Invitation tokens are credential-equivalent secrets. Logging them in cleartext creates recoverable exposure in application logs and violates the redaction intent of P3-S14.

The new metadata keeps operational value without leaking token material.

## Verification run

- `npm run type-check` (backend) -> pass
- Lint diagnostics for `invitationRoutes.ts` -> no issues
