# 411 - Step 5: document email, PDF export, and closure XLSX - Implementation

Date: 2026-06-11  
Plan reference: `docs/patch-notes/410-STEP5-DOCUMENT-EMAIL-EXPORT-PDF-PLAN.md`

---

## 1) What was delivered

Step 5 closes the printing/mailing gap left after Step 4 (invoice compliance UAT checklist).

Main outputs:

1. server-side PDF generation for receipts, invoices, and closure bulletins,
2. period recap XLSX for weekly/monthly/annual closure bulletins,
3. SendGrid email endpoints with PDF (+ XLSX when applicable) attachments,
4. frontend "Envoyer par email" and PDF/Excel export actions,
5. deployment runbook for cloud print + mail.

---

## 2) Backend files

| File | Role |
|------|------|
| `MuseBar/backend/src/services/documents/documentPdfService.ts` | A4 PDF renderers from `printDataRepo` payloads |
| `MuseBar/backend/src/services/documents/closureXlsxService.ts` | Daily-closure recap workbook (exceljs) |
| `MuseBar/backend/src/services/documents/documentEmailService.ts` | SendGrid send orchestration + recipient validation |
| `MuseBar/backend/src/routes/printing.ts` | Export + email routes |
| `MuseBar/backend/src/printing/printDataRepo.ts` | Invoice `customer_info` on print payload |
| `MuseBar/backend/src/services/receipts/EmailReceiptService.ts` | Marked `@deprecated` (orphaned Nodemailer path) |

### New API routes

- `GET /api/printing/receipt/:orderId/export-pdf`
- `POST /api/printing/receipt/:orderId/email`
- `GET /api/printing/invoice/:invoiceId/export-pdf`
- `POST /api/printing/invoice/:invoiceId/email`
- `GET /api/printing/closure/:bulletinId/export-pdf`
- `GET /api/printing/closure/:bulletinId/export-xlsx`
- `POST /api/printing/closure/:bulletinId/email`

Invoice safeguards (Phase C) apply to export and email same as print/preview.

---

## 3) Frontend files

| File | Change |
|------|--------|
| `MuseBar/src/services/api/printing.ts` | Authenticated download + email API helpers |
| `MuseBar/src/components/POS/PrintAfterSaleDialog.tsx` | Email field, PDF export, send by email |
| `MuseBar/src/components/Closure/PrintClosureDialog.tsx` | Email, PDF, Excel (period bulletins), JSON export |

---

## 4) Tests added

- `documentPdfService.test.ts` — PDF buffer smoke tests
- `closureXlsxService.test.ts` — period detection + row/total layout
- `printing.routes.test.ts` — export PDF, invoice email, compliance block, XLSX export

---

## 5) Documentation / ops

- `docs/runbooks/INVOICE-UAT-CHECKLIST-POS-HISTORY.md` — E-12+ email/export cases
- `docs/runbooks/DEPLOY-PRINT-AND-EMAIL.md` — production deployment guide
- `MuseBar/backend/.env.example` — `FROM_EMAIL`, `APP_URL`

---

## 6) Dependency

- `exceljs` added to backend for closure recap spreadsheets.

---

## 7) Operational note

Epson print job queue remains in-memory (`epsonJobStore`). Server restart drops queued jobs; documented in deploy runbook.
