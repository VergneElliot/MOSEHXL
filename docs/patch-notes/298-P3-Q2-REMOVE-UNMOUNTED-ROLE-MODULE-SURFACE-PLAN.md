# 298 — P3-Q2 remove unmounted role module surface (plan)

## Objective

Eliminate dead/unmounted backend role-management code under `routes/userManagement/roles/*` to avoid false live-surface signals in reviews and audits.

## Scope

### In scope

- Confirm role module is not mounted by application routes.
- Remove unreferenced role module files under `routes/userManagement/roles/`.
- Keep active user-management API behavior unchanged (`/api/auth/users` and invitation routes).
- Run full backend validation after removal.

### Out of scope

- Reintroducing role management through new mounted endpoints.
- Refactoring active auth/user-management APIs.

## Design decisions

1. Prefer deletion over mounting because established behavior is already served by `/api/auth/users`.
2. Keep user-management router comments explicit about mounted modules to avoid regressions.

## Verification plan

- Backend type-check.
- Full backend test suite.
- Search to ensure no remaining code references removed role module symbols.
