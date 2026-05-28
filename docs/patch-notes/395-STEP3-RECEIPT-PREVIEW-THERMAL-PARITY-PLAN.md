# 395 - Step 3 (receipt preview vs thermal payload parity) - Plan

## Context

Step 1 restored receipt preview/print UX.
Step 2 completed closure bulletin print UX.

Step 3 focuses on parity: what operators/accounting see in receipt preview must be reflected in what Epson thermal printing actually outputs.

Current gap:

- Frontend receipt preview (`LegalReceiptContainer`) is compliance-rich.
- Epson thermal payload (`receiptToEposPrintXml`) is still materially lighter.

## Goal

Reduce preview-vs-print divergence for receipts by aligning mandatory legal/fiscal fields in Epson payload with the preview/business requirements.

## Scope

### In scope

- Enrich receipt ePOS XML content with legal/business/tax parity fields.
- Keep output Epson-compatible plain text (no UI-only visuals).
- Add focused tests validating presence of parity-critical fields.
- Document final parity behavior and residual differences.

### Out of scope

- Pixel-identical rendering between browser preview and thermal print.
- Full B2B invoice subsystem.
- Printer hardware/codepage profiling per model.

## Planned changes

1. Update `receiptToEposPrintXml` to include:
   - business identity (name/address/phone/email + SIRET/TVA when available),
   - ticket/order/date/payment core headers,
   - detailed items section (current detailed mode),
   - VAT breakdown lines by rate + totals (HT/TVA/TTC),
   - optional tips/change lines when present,
   - compliance lines (hash, register id, operator id),
   - legal mention reference (`Article 286-I-3 bis du CGI`).
2. Add receipt parity tests for ePOS payload required markers.
3. Keep closure bulletin print parity from Step 2 unchanged.

## Acceptance criteria

- Thermal receipt payload includes key legal/fiscal fields expected from preview context.
- Required compliance markers exist in XML payload.
- No type/lint regressions.
- New parity test(s) pass.

## Verification plan

1. `npm run type-check --workspace MuseBar`
2. `npm run lint --workspace MuseBar`
3. `npm run test --workspace MuseBar/backend -- src/services/printing/eposPrintXml.receiptParity.test.ts`
