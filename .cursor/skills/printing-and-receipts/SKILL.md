---
name: printing-and-receipts
description: >-
  Receipt printing, kitchen printers, email receipts, and the LAN print bridge
  for MOSEHXL/MuseBar. Use when modifying printing services, ESC/POS, PrintNode,
  bridge queue, or receipt/email delivery.
---

# Printing and Receipts

## Architecture

```
Backend services/printing/     — driver implementations (Epson, network ESC/POS)
Backend printing/              — runtime manager, job queue, config repos
Backend services/receipts/     — digital, email, QR receipts
Backend services/kitchenPrinting/ — kitchen ticket dispatch + render
MuseBar/bridge/                — LAN Node bridge (cloud queue → Epson TM-m30II)
```

Routes: `routes/printing.ts`, `routes/printing/`, `routes/kitchenPrinters.ts`

## Print methods

| Method | Use case |
|--------|----------|
| Browser print | Fallback receipt preview |
| Network ESC/POS | Direct LAN printer |
| Print bridge | `MuseBar/bridge` polls cloud queue, prints locally |
| StarCloudPRNT | Cloud printer protocol |

## Bridge setup

Runbook: `docs/runbooks/PRINT-BRIDGE-V1.md`

```bash
cd MuseBar/bridge && npm run build && npm start
```

Bridge connects establishment LAN printer to backend job queue.

## Kitchen printing flow

1. Order completes → `dispatchKitchenTicketsForCompletedOrder`
2. Group items by kitchen printer assignment
3. Render ticket (`kitchenTicketRenderer.ts`)
4. Enqueue print job or send to bridge

Product → printer mapping: `product_kitchen_printers` table.

## Email receipts

`services/receipts/EmailReceiptService.ts` — SendGrid templates.

Closure auto-email: `services/documents/closureAutoEmail.ts` attaches Flux 10.3 XML.

## Settings UI gap

Printer settings tab exists (`PrinterSetup.tsx`) but may not be fully wired to backend — check before assuming connectivity.

## Related skills

- `pos-and-floor-service` — kitchen dispatch triggers
- `backend-api-route` — printing route patterns
- `patch-notes-workflow` — print bridge patches #412–430

## Runbooks

- `docs/runbooks/DEPLOY-PRINT-AND-EMAIL.md`
- `docs/runbooks/PRINT-BRIDGE-V1.md`
