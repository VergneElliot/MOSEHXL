# 244 - P2-Q2 (empty controllers directory cleanup) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-Q2)

## Why this patch exists

`MuseBar/backend/src/controllers/` exists as an empty structural artifact while
the backend architecture is route/service/model based.

Keeping an empty top-level directory with no active role creates unnecessary
noise and can mislead maintainers about architectural intent.

## Scope

### In scope

1. Confirm `controllers/` has no files and no imports/references.
2. Remove the empty directory artifact.
3. Document the cleanup and verification.

### Out of scope

- Creating new controller abstractions.
- Route/service refactoring.

## Design choices

1. **No-behavior cleanup only**
   - Delete directory artifact only; no runtime code changes.

2. **Keep architecture explicit**
   - Documentation clarifies that routes currently act as thin controllers.

## Strategy

### Step 1 - Validate emptiness

Checks:
1. Confirm no files exist under `backend/src/controllers`.
2. Confirm directory contains no required placeholders.

### Step 2 - Remove artifact

Action:
1. Delete empty `backend/src/controllers` directory from workspace.

### Step 3 - Verify

Run:
- quick status checks and lint diagnostics on touched docs.

## Acceptance criteria

1. `backend/src/controllers` no longer exists in workspace.
2. No code or runtime behavior changed.
