# 238 - P2-S15 (stderr to structured logger) - Plan

Date: 2026-05-01  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P2-S15)

## Why this patch exists

Two backend paths still write errors directly with `process.stderr.write(...)`:

- `routes/legal/businessDayStats.ts`
- `models/auditTrail.ts`

That bypasses the structured logging pipeline and weakens consistency for
observability, filtering, and incident triage.

## Scope

### In scope

1. Replace direct stderr writes with structured logger calls.
2. Use lazy-safe logger helper to avoid bootstrap-order regressions.
3. Keep existing error response/throw behavior unchanged.
4. Verify with targeted tests and type-check.

### Out of scope

- Broader logging schema redesign.
- Refactoring all remaining ad-hoc `res.status(500)` branches.

## Design choices

1. **Use `logError(...)` helper**
   - avoids eager `Logger.getInstance()` requirements in modules that can load
     before logger initialization in isolated test contexts.

2. **No behavior changes**
   - route still returns same HTTP 500 payload.
   - model still rethrows original error after logging.

## Strategy

### Step 1 - Replace stderr calls

Files:
- `MuseBar/backend/src/routes/legal/businessDayStats.ts`
- `MuseBar/backend/src/models/auditTrail.ts`

Plan:
1. Import `logError` from logger utility.
2. Replace `process.stderr.write(...)` with `logError(...)`.

### Step 2 - Verify

Run:
- targeted legal-route permission tests touching business-day-stats behavior,
- backend type-check,
- lint diagnostics for touched files.

## Acceptance criteria

1. No `process.stderr.write` remains in the two targeted files.
2. Error paths emit through structured logger helper.
3. Existing route/model runtime behavior remains unchanged.
