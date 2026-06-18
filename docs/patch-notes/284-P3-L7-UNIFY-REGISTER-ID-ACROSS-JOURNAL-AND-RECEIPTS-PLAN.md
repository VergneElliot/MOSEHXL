# 284 - P3-L7 (Unify register identifier across journal and receipts) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L7)

## Why this patch exists

Audit P3-L7 identified identifier drift:

- legal journal hash payload defaulted to global `MUSEBAR-REG-001`,
- printed receipts/bulletins used `CR-${establishment_id}`.

This breaks the legal requirement that the printed register identity matches the
identity used in the hashed fiscal journal chain for the same establishment.

## Scope

### In scope

1. Introduce one canonical register-id resolver.
2. Use this resolver in:
   - journal entry creation/hash path,
   - receipt/closure print data builders,
   - archive compliance metadata.
3. Remove remaining hardcoded `MUSEBAR-REG-001` runtime usage.
4. Keep bootstrap schema example aligned with new identifier format.

### Out of scope

- Multi-register per establishment inventory model.
- Register activation/provisioning lifecycle.

## Strategy

### Step 1 - Shared register-id resolver

Add `utils/registerId.ts` exposing `getRegisterIdForEstablishment(establishmentId)`
that returns normalized `CR-<establishment-id>` (with a safe fallback for missing IDs).

### Step 2 - Journal path alignment

Update legal journal internals to use establishment-scoped register id:

1. `JournalSigning.getRegisterKey(establishmentId?)`
2. `JournalOperations` calls
3. `JournalQueries.appendEntryTransactional` fallback register id

### Step 3 - Receipt/archive alignment

1. Replace ad-hoc `CR-${id}` formatting with shared resolver in `printDataRepo.ts`.
2. Replace hardcoded register mentions in closure print/email rendering with
   `compliance_info.cash_register_id` when available.
3. Replace archive export compliance hardcoded register id with shared resolver.

### Step 4 - Verify

1. Targeted tests (`journalSigning.integrity`, printing legal mention).
2. Backend type-check.
3. Full backend suite.
4. Lint diagnostics on touched files.

## Acceptance criteria

1. Journal hash payload and printed compliance surfaces use the same register ID
   convention per establishment.
2. No runtime hardcoded `MUSEBAR-REG-001` remains in backend source.
3. Tests and type-check pass cleanly.

