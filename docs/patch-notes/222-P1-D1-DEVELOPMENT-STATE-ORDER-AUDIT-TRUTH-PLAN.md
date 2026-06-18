# 222 - P1-D1 (DEVELOPMENT-STATE order-audit truth alignment) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-D1)

## Why this patch exists

`DEVELOPMENT-STATE.md` still listed Known Issue #9 as unresolved:

- "`orderAudit.ts` GET stubs return empty arrays"

That statement is stale. The read endpoints were wired in the non-blocking fix
pass and now call real audit trail queries.

## Scope

### In scope

1. Remove stale Known Issue #9 from non-blocking open issues.
2. Record it under the resolved-known-issues section with clear status text.
3. Keep all other issue statuses unchanged.
4. Document implementation and verification.

### Out of scope

- Other DEVELOPMENT-STATE rewrite items (D2/D3 and beyond).
- Route/code changes.

## Design choices

1. **Issue history preserved**
   - Do not silently delete context.
   - Move #9 into the "Previously known issues, now resolved" block.

2. **Truth-first wording**
   - Explicitly state that reads are now wired through
     `AuditTrailModel.getOrderAuditEntries`.

## Strategy

### Step 1 - Update DEVELOPMENT-STATE

File:
- `DEVELOPMENT-STATE.md`

Plan:
1. Remove stale Known Non-Blocking row #9.
2. Add a resolved entry in the resolved-known-issues block.

### Step 2 - Verify

Run:
- lint diagnostics on touched doc file.

## Acceptance criteria

1. DEVELOPMENT-STATE no longer claims #9 is still a stub.
2. Resolved history for #9 remains visible for traceability.
