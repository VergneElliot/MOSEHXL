# 92 - Phase D2 (Strict Permission Enforcement) - Plan

Date: 2026-04-23  
Phase: D2 from `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md`

## Why this patch exists

The current permission middleware still grants a broad bypass to `system_admin` users:

- `requirePermission(...)` immediately allows `system_admin`.
- `requireAnyPermission(...)` immediately allows `system_admin`.

This is convenient but weakens least-privilege control and makes route protection less explicit.
D2 removes this implicit bypass so permission-gated routes are truly permission-gated.

## Scope

### In scope

1. Remove automatic `system_admin` bypass in permission middleware.
2. Keep `requireAdmin` for explicitly system-only routes.
3. Update/add tests to validate strict behavior.
4. Document operational impact and verification.

### Out of scope

- Large route architecture redesign.
- New role taxonomy.
- Frontend permission UX changes.

## Design choices

- **Strict means strict**: a route protected by `requirePermission` must check DB-granted permissions for all users, including `system_admin`.
- **System-only routes remain explicit**: routes that must be restricted to system scope keep `requireAdmin`.
- **Backward-compatible failures**: denied requests return existing `403 Permission denied` responses.

## Step-by-step plan

### Step 1 - Middleware hardening
- Remove `system_admin` short-circuit branches in:
  - `requirePermission(...)`
  - `requireAnyPermission(...)`

### Step 2 - Tests
- Update `auth.permission` tests to assert:
  - no automatic pass for `system_admin` without DB permission;
  - success only when required permission(s) exist in DB grants.

### Step 3 - Verification
- Run backend checks:
  - `npm run type-check`
  - `npm test`

### Step 4 - Documentation
- Add implementation patch note with:
  - exact behavior changes,
  - test evidence,
  - operational implications.

## Acceptance criteria

- Permission middleware no longer bypasses `system_admin`.
- Permission-gated routes require real DB-granted permissions.
- Type-check and tests pass.
- D2 plan + implementation docs recorded.
