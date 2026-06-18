# 316 — P3-S11 production default explicit admin permissions (plan)

## Objective

Set `ESTABLISHMENT_ADMIN_PERMISSION_MODE` to default to `explicit_only` in production to reduce tenant admin blast radius when explicit permission rows are missing or misconfigured.

## Scope

### In scope

- Update runtime permission-mode resolution to be environment-aware.
- Keep explicit env override support for both modes.
- Add regression coverage for production-default behavior.
- Document the env var default behavior in `.env.example`.

### Out of scope

- Changing permission assignment flows or seeds.
- Enforcing explicit mode in non-production environments.

## Design decisions

1. If `ESTABLISHMENT_ADMIN_PERMISSION_MODE` is set, honor it exactly (`implicit_all` or `explicit_only`).
2. If unset, default to `explicit_only` only when `NODE_ENV=production`.
3. Keep non-production default as `implicit_all` for local setup ergonomics.

## Verification plan

- Backend type-check.
- Targeted tests:
  - `src/models/user.permissionMode.test.ts`
