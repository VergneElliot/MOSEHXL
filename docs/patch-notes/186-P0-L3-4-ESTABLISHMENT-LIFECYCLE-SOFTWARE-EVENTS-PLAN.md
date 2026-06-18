# 186 - P0-L3.4 (Establishment Lifecycle Software Events) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L3 continuation)

## Why this patch exists

L3.1, L3.2, and L3.3 covered settings, runtime lifecycle, and user-management changes.
The next high-value software-event surface is establishment lifecycle mutations:

- establishment creation,
- establishment deletion.

These operations materially change tenant topology and should be visible in software-event journal traces.

## Beginner-friendly framing

When a new establishment is created or removed, this changes the legal/audit perimeter itself.
So in addition to audit logs, we want software-event entries that mark:

- who triggered the lifecycle action,
- which establishment was affected,
- minimal contextual metadata.

## Scope

### In scope

1. Extend software-event event-type union for establishment lifecycle events.
2. Wire `enhancedEstablishments` mutation routes:
   - `POST /api/establishments`
   - `DELETE /api/establishments/:id`
3. Add route-level regression tests for hook invocation.
4. Document implementation and verification.

### Out of scope

- Establishment status/subscription transitions in deeper service flows.
- Time-change detection events.
- Event schema redesign across all prior L3 patches.

## Design choices

1. **Route-level hooks**
   - Keep implementation focused and easy to verify.
   - No changes to service contracts required.

2. **Best-effort event logging**
   - Lifecycle API responses should not fail only due to software-event append failure.
   - Errors remain logged through helper internals.

3. **Minimal event payload**
   - Capture actor, target establishment id, and key context.

## Step-by-step strategy

### Step 1 - Event type extension

File:
- `backend/src/services/legal/softwareEventJournal.ts`

Plan:
- Add:
  - `ESTABLISHMENT_CREATED`
  - `ESTABLISHMENT_DELETED`

### Step 2 - Route wiring

File:
- `backend/src/routes/enhancedEstablishments.ts`

Plan:
- On successful creation:
  - append `ESTABLISHMENT_CREATED` with target id/name and actor id.
- On successful deletion:
  - append `ESTABLISHMENT_DELETED` with target id and actor id.

### Step 3 - Tests

File:
- `backend/src/routes/enhancedEstablishments.softwareEvents.test.ts` (new)

Plan:
- assert create route triggers software-event helper.
- assert delete route triggers software-event helper.

### Step 4 - Verify

Run:
- targeted route tests,
- backend type-check,
- lint diagnostics on edited files.

## Acceptance criteria

1. Establishment create/delete routes emit software events on success.
2. Regression tests verify hook invocation.
3. Existing API contracts remain unchanged.
4. Plan + implementation patch notes are added.
