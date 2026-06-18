# 207 - P1-L6 (Thermal Receipt Legal Mention) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/206-P1-L6-THERMAL-RECEIPT-LEGAL-MENTION-PLAN.md`

## What was implemented

This patch closes P1-L6 by adding the statutory legal reference to thermal
receipt body content.

## 1) Receipt content update

Updated:
- `MuseBar/backend/src/services/printing/BasePrintingService.ts`

Change:
- Added legal line inside receipt footer section:
  - `Ref. legale: Article 286-I-3 bis du CGI`

Placement:
- appears in thermal receipt body before the thank-you line.

Closure bulletin legal block remains unchanged.

## 2) Regression test added

New:
- `MuseBar/backend/src/services/printing/BasePrintingService.receiptLegalMention.test.ts`

Coverage:
- renders receipt content via a test subclass,
- asserts presence of:
  - `Ref. legale: Article 286-I-3 bis du CGI`.

## Verification

Executed:

1. `npm run test -- src/services/printing/BasePrintingService.receiptLegalMention.test.ts src/routes/printing.routes.test.ts`
   - Result: 2 files passed, 28 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-L6 is complete: thermal ticket body now carries the same legal reference
already used in other compliance-facing output channels.
