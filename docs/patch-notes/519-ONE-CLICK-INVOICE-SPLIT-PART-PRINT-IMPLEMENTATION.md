# 519 — One-click invoices + split-part print (IMPLEMENTATION)

## Summary

Invoice create defaults client name to « Client », address optional, payment legal
mentions auto-filled for POS sales already paid. Print dialog: one-click facture;
optional « Infos client / B2B ». Split orders: pick payment part N for ticket or
facture (synthetic line + proportional VAT; `legal_invoices.sub_bill_id`).

## Files

- Migration `2026_09_10_16_46_01_legal_invoices_sub_bill_id.sql`
- `invoiceFieldDefaults.ts`, `createLegalInvoiceFromOrder.ts`, `insertLegalInvoiceRow.ts`
- `printDataSubBill.ts`, printing document routes/handlers/export
- FE: `PrintAfterSaleDialog` split + extracted extras/preview/helpers
- `printing.ts` API: optional `subBillId` on receipt PDF/email

## Verification

- [x] invoices.routes tests (10), tsc, module-size (dialog ratchet 668→445)
- [ ] Manual: one-click facture; expand B2B fields; split part 2 ticket + facture
- [ ] `cd MuseBar/backend && npm run migration:migrate`
