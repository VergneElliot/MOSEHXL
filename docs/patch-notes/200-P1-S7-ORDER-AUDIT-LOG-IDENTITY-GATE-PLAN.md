# 200 - P1-S7 (Order Audit Log Identity + Permission Gate) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-S7)

## Why this patch exists

`POST /api/orders/audit/log` currently has two issues:

1. no granular permission gate (`requireAuth` only),
2. caller controls `userId` in request body (audit-actor forgery risk).

## Scope

### In scope

1. Add permission gate: `requirePermission(P.access_pos)`.
2. Bind `user_id` from authenticated session (`req.user.id`), not request body.
3. Keep endpoint contract otherwise stable.
4. Add regression tests for deny/allow and identity binding.
5. Document implementation and verification.

### Out of scope

- Refactor route to `asyncHandler` + `AppError` (tracked separately as Q12).

## Design choices

1. **Permission key**
   - Use `access_pos` per audit recommendation for this POS operational endpoint.

2. **Session-bound actor identity**
   - Ignore body `userId` to prevent spoofing.

## Strategy

### Step 1 - Route hardening

File:
- `MuseBar/backend/src/routes/orders/orderAudit.ts`

Plan:
- add `requirePermission(P.access_pos)` on POST route,
- remove body `userId` usage,
- set `user_id: String(req.user!.id)` when writing audit entry.

### Step 2 - Regression tests

File:
- `MuseBar/backend/src/routes/orders/orderAudit.log.permissions.test.ts` (new)

Plan:
- deny POST without `access_pos`,
- allow POST with `access_pos`,
- prove body-supplied `userId` is ignored and session user id is used.

### Step 3 - Verify

Run:
- new audit-log gate tests + existing read tests,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. POST audit logging requires `access_pos`.
2. Audit actor is always derived from session.
3. Tests confirm no user-id forgery path remains.
