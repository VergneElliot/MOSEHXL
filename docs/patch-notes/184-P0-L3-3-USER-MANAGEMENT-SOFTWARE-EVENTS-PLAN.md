# 184 - P0-L3.3 (User Management Software Events) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3 continuation)

## Why this patch exists

L3.1 covered business configuration mutations.  
L3.2 covered runtime lifecycle events.

L3.3 now targets security-sensitive user-management mutations that affect who can do what:

- permission assignments,
- role changes,
- establishment user create/delete.

These are high-value software events for fiscal/security traceability.

## Beginner-friendly framing

Audit trail already records these actions, but software-event journaling adds them to the legal-journal chain itself.

So we keep two records:

1. Audit trail (who did what),
2. Legal journal software event (tamper-evident event trace in fiscal chain).

## Scope

### In scope

1. Extend software-event event-type union for user-management mutations.
2. Wire `authRegister.ts` user-management routes to append software events (best effort):
   - POST `/api/auth/users`
   - DELETE `/api/auth/users/:id`
   - POST/PUT `/api/auth/users/:id/permissions`
   - PUT `/api/auth/users/:id/role`
3. Add route-level regression tests for these hooks.
4. Document implementation and verification.

### Out of scope

- Establishment status transition hooks in orchestration services (candidate L3.4).
- Time-change detection.
- System-admin bootstrap event shaping.

## Design choices

1. **Hook in existing route success paths**
   - Minimal blast radius.
   - No behavior changes for failure responses.

2. **Best-effort journaling**
   - Keep user-management operations available even if software-event append fails.
   - Errors logged through existing helper behavior.

3. **Explicit event names**
   - `ESTABLISHMENT_USER_CREATED`
   - `ESTABLISHMENT_USER_DELETED`
   - `USER_PERMISSIONS_UPDATED`
   - `USER_ROLE_UPDATED`

## Step-by-step strategy

### Step 1 - Extend event types

File:
- `backend/src/services/legal/softwareEventJournal.ts`

Plan:
- Add user-management event literals to `SoftwareEventType`.

### Step 2 - Route wiring

File:
- `backend/src/routes/authRegister.ts`

Plan:
- On successful mutations, append software events with establishment scope + actor id + minimal event payload.

### Step 3 - Tests

File:
- `backend/src/routes/authRegister.softwareEvents.test.ts` (new)

Plan:
- Assert software-event helper called for:
  - permissions update,
  - role update,
  - establishment-user create,
  - establishment-user delete.

### Step 4 - Verify

Run:
- targeted new test file,
- backend type-check,
- lint diagnostics on edited files.

## Acceptance criteria

1. User-management mutation routes append software events on success.
2. Regression tests prove hook invocation.
3. No change to existing API response contracts.
4. Plan + implementation patch notes are added.
