# 396 - Step 3 (receipt preview vs thermal payload parity) - Implementation

## What was delivered

Step 3 parity hardening is implemented for receipt thermal output.

Delivered outcomes:

1. Epson receipt payload now includes core legal/fiscal fields expected from preview context.
2. Receipt thermal content now includes business legal identity (SIRET/TVA) when available.
3. VAT breakdown lines are printed by rate with HT/TVA totals.
4. Compliance lines now include hash, register id, operator id, and legal mention.
5. Focused automated parity test added for receipt ePOS payload markers.

## Changed files

### Backend print payload

- `MuseBar/backend/src/services/printing/eposPrintXml.ts`
  - enriched `receiptToEposPrintXml` with:
    - business identity lines (name/address/phone/email/SIRET/TVA),
    - ticket metadata and type line,
    - item details with per-item tax hint,
    - VAT breakdown section by rates,
    - HT/TVA/TTC totals,
    - optional tips/change lines,
    - compliance lines (hash, cash register, operator),
    - legal mention (`Article 286-I-3 bis du CGI`) and security marker.

### Backend test coverage

- `MuseBar/backend/src/services/printing/eposPrintXml.receiptParity.test.ts` (new)
  - validates presence of parity-critical markers in generated receipt ePOS XML.

## Behavior before vs after

### Before

- Receipt thermal payload was minimal vs preview detail.
- Several legal/accounting markers shown in preview context were missing from printed payload.

### After

- Receipt thermal payload now carries legal/fiscal content aligned with preview/business requirements.
- Preview and printed receipt remain format-different by medium (UI vs thermal), but key accounting/legal fields are now aligned.

## Verification evidence

Commands run from repository root:

1. `npm run type-check --workspace MuseBar`
2. `npm run lint --workspace MuseBar`
3. `npm run test --workspace MuseBar/backend -- src/services/printing/eposPrintXml.receiptParity.test.ts`

All pass for this step (existing unrelated backend lint warnings remain).

## Residual differences (expected)

- Browser preview remains visually richer (icons/layout/colors) than thermal print.
- Thermal output is intentionally plain-text oriented for Epson compatibility.
