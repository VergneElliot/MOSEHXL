# 118 - P2-1 (Dead Code Quarantine Pass 1) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-23-full-repo-state-audit-hard-copy.md`

## Why this patch exists

P2 item #9 requires removing or quarantining remaining legacy/dead files.  
A concrete residual target still present is:

- `MuseBar/backend/src/middleware/security/CorsConfiguration.ts`

This module is not referenced by runtime wiring (`app.ts` now owns CORS policy directly) and creates drift risk by presenting a second, unused CORS strategy.

## Scope

### In scope

1. Remove unused CORS helper module (`CorsConfiguration.ts`).
2. Remove dead exports from `middleware/security/index.ts`.
3. Verify backend type-check and lints after deletion.
4. Document the cleanup.

### Out of scope

- Reworking active CORS behavior in `app.ts`.
- Larger dead-code sweep beyond this specific verified target.

## Design choices

- Prefer deletion over deprecation for fully unreferenced modules.
- Keep active CORS path as single source of truth in `app.ts`.

## Step-by-step plan

### Step 1 - Remove dead module and exports
- Delete `middleware/security/CorsConfiguration.ts`.
- Remove `CorsConfigurationService`/`createCorsOptions` re-export from security barrel.

### Step 2 - Verify
- Run backend type-check.
- Run lint diagnostics on touched files.

### Step 3 - Document
- Add implementation note with rationale and verification results.

## Acceptance criteria

- No references to `CorsConfiguration` remain.
- Backend builds/type-checks cleanly.
- Documentation reflects this dead-code quarantine pass.
