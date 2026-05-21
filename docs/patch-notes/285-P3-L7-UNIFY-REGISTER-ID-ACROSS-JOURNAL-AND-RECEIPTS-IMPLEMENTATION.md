# 285 - P3-L7 (Unify register identifier across journal and receipts) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/284-P3-L7-UNIFY-REGISTER-ID-ACROSS-JOURNAL-AND-RECEIPTS-PLAN.md`

## What changed

### 1) Added canonical register-id resolver

Added:

- `MuseBar/backend/src/utils/registerId.ts`

Provides:

- `getRegisterIdForEstablishment(establishmentId)` -> `CR-<establishment-id>`
- safe fallback (`CR-UNKNOWN`) when establishment id is missing.

### 2) Unified legal journal register-id generation

Updated:

- `MuseBar/backend/src/models/legalJournal/journalSigning.ts`
- `MuseBar/backend/src/models/legalJournal/journalOperations.ts`
- `MuseBar/backend/src/models/legalJournal/journalQueries.ts`
- `MuseBar/backend/src/models/legalJournal/journalSigning.integrity.test.ts`

Changes:

1. `JournalSigning.getRegisterKey()` now resolves per establishment.
2. `JournalOperations` now passes establishment context when building register id.
3. Transactional append path now defaults register id via establishment-scoped resolver.
4. Integrity test now uses establishment-scoped register id fixture.

### 3) Unified receipt/closure surfaces

Updated:

- `MuseBar/backend/src/printing/printDataRepo.ts`
- `MuseBar/backend/src/services/printing/BasePrintingService.ts`
- `MuseBar/backend/src/services/receipts/EmailReceiptService.ts`

Changes:

1. Replaced inline `CR-${establishment_id}` string formatting with shared resolver.
2. Closure print/email legal footer now prints dynamic register id from compliance
   payload rather than hardcoded global ID.

### 4) Unified archive compliance metadata

Updated:

- `MuseBar/backend/src/models/archiveService.ts`

Changes:

1. Replaced hardcoded archive compliance `register_id` with establishment-scoped resolver.
2. XML fallback register id now uses same resolver fallback.

### 5) Bootstrap schema alignment

Updated:

- `MuseBar/backend/src/models/legal-schema.sql`

Changed initial bootstrap journal row register id from `MUSEBAR-REG-001` to
`CR-UNKNOWN` to stay consistent with runtime convention and fallback behavior.

### 6) Audit tracker update

Updated:

- `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`

Added fixed-state line for P3-L7 register-id unification.

## Verification

Executed:

1. `npm run type-check` (backend) -> pass
2. `npx vitest run src/models/legalJournal/journalSigning.integrity.test.ts src/services/printing/BasePrintingService.receiptLegalMention.test.ts` -> pass
3. `npx vitest run` (backend full suite) -> pass (`47/47`, `185/185`)
4. lint diagnostics on touched files -> no issues

## Result

P3-L7 is closed:

- journal hash payload identity and printed/archive compliance identity are now
  derived from the same establishment-scoped register-id rule.

