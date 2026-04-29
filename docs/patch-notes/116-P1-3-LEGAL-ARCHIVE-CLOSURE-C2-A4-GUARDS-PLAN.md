# 116 - P1-3 (Legal Archive/Closure C2 + A4 Guard Verification) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

After P1-2, remaining legal perimeter routes still had C2-style gaps:

1. `legal/archive.ts` uses ad-hoc local error handling with `process.stderr`.
2. `legal/closure.ts` uses ad-hoc local error handling with `process.stderr`.

For A4, both routers are already globally gated with `requirePermission(P.access_closure)`, but regression coverage is thin and should be locked with tests.

## Scope

### In scope

1. Migrate `legal/archive.ts` and `legal/closure.ts` to centralized error flow:
   - `asyncHandler`
   - structured `logger.error(...)`
   - `AppError` throws for server-failure paths.
2. Preserve validation/status semantics (`400`, `404`, `409`) where already intentional.
3. Add focused regression tests proving `access_closure` gate is enforced on key archive/closure endpoints.
4. Document and verify.

### Out of scope

- Business logic redesign for archive export placeholder behavior.
- Closure domain logic changes (period calculations, force semantics, fiscal payload schema).

## Design choices

- Keep `router.use(requireAuth, requirePermission(P.access_closure))` unchanged.
- Keep endpoint payloads and successful response structures unchanged.
- Use route-specific AppError codes for observability.

## Step-by-step plan

### Step 1 - C2 cleanup in archive/closure routes
- Add `Logger`, `asyncHandler`, and `AppError` usage.
- Replace local stderr+500 responses with structured logger + `AppError`.

### Step 2 - A4 regression guards
- Add legal route permission tests for archive and closure surfaces:
  - 403 when `access_closure` is missing,
  - success path when `access_closure` is present.

### Step 3 - Verification and docs
- Run targeted tests and backend type-check.
- Add implementation note with verification evidence.

## Acceptance criteria

- `archive.ts` and `closure.ts` align with centralized C2 error style.
- `access_closure` permission gates are covered by automated tests.
- Tests and type-check pass.
