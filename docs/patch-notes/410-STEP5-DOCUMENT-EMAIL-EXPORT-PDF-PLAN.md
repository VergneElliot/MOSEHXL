# 410 - Step 5: document email, PDF export, and closure XLSX - Plan

Date: 2026-06-11  
Parent plan: `docs/patch-notes/390-FEATURE-RECEIPTS-INVOICES-CLOSURE-PRINTING-PLAN.md`

---

## 1) Goal

Ship server-side document export and email delivery for:

1. customer receipts (tickets),
2. legal invoices,
3. closure bulletins (PDF + optional period recap XLSX).

Use the live SendGrid stack (`EmailService` / `EmailSender`). Deprecate the orphaned Nodemailer `EmailReceiptService` path.

---

## 2) Scope

### In scope

1. PDF generation from existing `printDataRepo` payloads (parity with preview/thermal).
2. XLSX recap for weekly/monthly/annual closure bulletins (one row per daily closure).
3. HTTP export endpoints (`export-pdf`, `export-xlsx`).
4. HTTP email endpoints (`POST .../email` with `{ to }`).
5. Frontend "Envoyer par email" + server PDF/Excel export actions.
6. Route/service tests, UAT checklist extension, deployment runbook.

### Out of scope

1. Invoice credit notes / avoirs.
2. Google OAuth / Calendar.
3. Persistent Epson job queue (in-memory queue remains).

---

## 3) API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/printing/receipt/:orderId/export-pdf` | Receipt PDF download |
| POST | `/api/printing/receipt/:orderId/email` | Email receipt PDF |
| GET | `/api/printing/invoice/:invoiceId/export-pdf` | Invoice PDF download |
| POST | `/api/printing/invoice/:invoiceId/email` | Email invoice PDF |
| GET | `/api/printing/closure/:bulletinId/export-pdf` | Bulletin PDF download |
| GET | `/api/printing/closure/:bulletinId/export-xlsx` | Period recap XLSX (non-daily) |
| POST | `/api/printing/closure/:bulletinId/email` | Email bulletin PDF (+ XLSX when applicable) |

All routes: JWT + establishment scope, same safeguards as preview/print.

---

## 4) Implementation phases

1. **Backend rendering** — `documentPdfService`, `closureXlsxService`.
2. **Backend routes** — export + email on `routes/printing.ts`.
3. **Frontend** — `PrintAfterSaleDialog`, `PrintClosureDialog`, `printing` API client.
4. **Tests + docs** — route tests, service smoke tests, UAT E-12+, deploy runbook.

---

## 5) Success criteria

1. Operator can email receipt, invoice, or bulletin from POS/History/Closure UI.
2. PDF attachments contain the same legal field class as preview/thermal.
3. Period closure emails include XLSX recap when closure type is weekly/monthly/annual.
4. Invoice safeguard blocks (422) apply to export and email same as print.
5. Deployment runbook documents env vars, migrations, SendGrid, and Epson poll setup.
