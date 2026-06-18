# 206 - P1-L6 (Thermal Receipt Legal Mention) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-L6)

## Why this patch exists

Audit P1-L6 flagged that thermal receipt body content did not include the statutory
reference text used elsewhere in the system:

- `Article 286-I-3 bis du CGI`.

Closure bulletin and email receipt paths already include this reference; thermal
ticket should match compliance messaging.

## Scope

### In scope

1. Add legal reference line to thermal receipt content generation.
2. Keep closure bulletin legal section unchanged.
3. Add regression test proving receipt content includes the legal mention.
4. Document implementation and verification.

### Out of scope

- Broader receipt layout redesign.
- Localization overhaul of receipt/footer wording.

## Design choices

1. **Reuse existing label style**
   - Use same string style already used in closure bulletin content:
   - `Ref. legale: Article 286-I-3 bis du CGI`.

2. **Placement near footer/compliance block**
   - Keep the mention in the compliance/info part of the ticket.

## Strategy

### Step 1 - Receipt content update

File:
- `MuseBar/backend/src/services/printing/BasePrintingService.ts`

Plan:
- insert legal reference line in `generateReceiptContent(...)` footer section.

### Step 2 - Regression test

File:
- `MuseBar/backend/src/services/printing/BasePrintingService.receiptLegalMention.test.ts` (new)

Plan:
- generate a receipt content string via a test subclass and assert presence of the legal mention.

### Step 3 - Verify

Run:
- new service-level receipt test,
- printing route tests sanity,
- backend type-check + lint diagnostics.

## Acceptance criteria

1. Thermal receipt content includes `Article 286-I-3 bis du CGI`.
2. Regression test catches accidental future removal.
