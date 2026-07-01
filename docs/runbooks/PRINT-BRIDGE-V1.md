# MuseBar Print Bridge V1 Runbook

Date: 2026-06-18  
Scope: local bridge process for cloud-to-LAN thermal receipt printing

---

## Purpose

MuseBar Cloud cannot directly reach a printer on `192.168.x.x`. The Print Bridge solves this by running a small Node.js process inside the establishment network:

```text
MuseBar Cloud -> durable print queue -> local bridge polls HTTPS -> Epson TM-m30II TCP 9100
```

V1 supports:

1. setup/test print jobs,
2. sale receipt print jobs,
3. ACK/FAIL reporting back to MuseBar Cloud.

Invoices and closure bulletins can use the same queue later, but V1 should be validated with test prints and sale receipts first.

---

## Configure Cloud

1. Log in as an establishment admin.
2. Go to **Settings -> Printer**.
3. Select **MuseBar Bridge**.
4. Save or test the configuration.
5. Copy the generated `.env` snippet shown by the UI.

The active printing configuration stores a `bridgeKey`. The local bridge must send this as `x-bridge-key`; do not share it publicly.

---

## Configure Cashier PC

On the cashier PC, from the repository:

```bash
cd MuseBar/bridge
```

Create `.env` from the UI snippet:

```env
MUSEBAR_API_URL=https://mosehxl.com
ESTABLISHMENT_ID=<establishment uuid>
BRIDGE_KEY=<generated bridge key>
PRINTER_DRIVER=network-escpos
PRINTER_HOST=192.168.0.95
PRINTER_PORT=9100
POLL_INTERVAL_MS=2000
```

If the printer receives a different DHCP address, update `PRINTER_HOST`.

### Kitchen printers (bar / cuisine)

For kitchen command tickets routed to multiple LAN printers, add `PRINTERS_JSON` to the same `.env`:

```env
PRINTERS_JSON=[{"slug":"bar","host":"192.168.0.95","port":9100},{"slug":"cuisine","host":"192.168.0.96","port":9100}]
```

- `slug` must match the **slug** configured on each kitchen printer in Menu admin.
- Receipt, invoice, and test receipt jobs still use `PRINTER_HOST` / `PRINTER_PORT`.
- `kitchen_order`, `kitchen_test`, and `kitchen_cancellation` jobs route by `metadata.kitchen_printer_slug`.
- If a kitchen slug is missing from `PRINTERS_JSON`, the bridge falls back to `PRINTER_HOST` (useful for single-printer setups).

---

## Run Bridge

```bash
cd MuseBar/bridge
npm run bridge
```

Expected startup output includes:

```text
MuseBar Print Bridge started
```

Leave the terminal running during service. V1 is intentionally a terminal process; service/installer packaging can come later.

---

## UAT

1. In MuseBar, send a **Settings -> Printer -> Test Configuration** print.
2. Confirm the bridge logs `Print job received`.
3. Confirm the Epson TM-m30II prints.
4. Confirm the bridge logs `Print job ACKed`.
5. Run a real sale and print the receipt from the POS flow.
6. Stop the bridge, send another test print, then restart the bridge and verify the pending job drains.

### Kitchen command tickets (product options feature)

1. In **Menu**, create kitchen printers (e.g. `Bar`, `Cuisine`) with matching slugs.
2. Assign printers to products; assign option groups (e.g. Cuisson) where needed.
3. Configure `PRINTERS_JSON` on the bridge PC (see above).
4. Complete a POS sale with options → bridge logs `kitchen_order` with `kitchenPrinterSlug`.
5. Confirm ticket shows product lines and options **without prices**.
6. Cancel the order (full or partial) → bridge logs `kitchen_cancellation` with `ANNULATION`.
7. Confirm receipt printing still uses `PRINTER_HOST` and is unchanged.

Kitchen enqueue failures are logged to the legal software journal (`KITCHEN_TICKET_ENQUEUE_FAILED`) but **do not** cancel the sale.

---

## Troubleshooting

1. **No job received**: verify `ESTABLISHMENT_ID`, `BRIDGE_KEY`, and that the cloud config provider is `bridge`.
2. **401 from poll**: the bridge key does not match the active cloud printing configuration.
3. **Printer timeout/refused**: verify the cashier PC is on the same LAN as the printer and `PRINTER_HOST:PRINTER_PORT` is reachable.
4. **Duplicate prints**: check whether the bridge crashed after printing but before ACK. V1 retries conservatively after failed/claimed jobs.
5. **Jobs remain pending**: the bridge is not running or cannot reach `MUSEBAR_API_URL`.
