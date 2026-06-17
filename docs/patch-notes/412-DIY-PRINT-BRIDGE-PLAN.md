# 412 - DIY Print Bridge Plan

Date: 2026-06-17  
Decision: MuseBar will implement a first-party local print bridge for non-Server-Direct printers.

---

## 1) Context

MuseBar now has a working cloud-first document stack:

1. receipt, invoice, and closure preview/export paths,
2. SendGrid document email for receipts and invoices,
3. Epson Server Direct Print support for compatible Epson TM-Intelligent printers,
4. a temporary LAN ESC/POS spike that proved the current bar printer can print via `host:9100`.

The current bar printer is an Epson TM-m30II, not a TM-m30II-NT. It does not expose Server Direct Print and cannot poll the cloud by itself. Direct LAN printing from the backend works only when the backend process is running on the same local network as the printer. It cannot work from the production cloud server because `192.168.x.x` addresses are private LAN addresses.

The product goal is broader than the current bar: MuseBar should be sellable to establishments without forcing them to replace existing printers. That rules out an Epson-only strategy as the sole long-term printing path.

---

## 2) Decision

Build a first-party **MuseBar Print Bridge**.

The bridge is a small local process running inside the establishment network. It polls MuseBar Cloud over outbound HTTPS, receives print jobs, and sends them to local printers using the correct local protocol.

Initial V1 target:

```text
MuseBar Cloud
  -> durable print job queue
  -> local bridge polls over HTTPS
  -> bridge sends ESC/POS to Epson TM-m30II at 192.168.0.95:9100
```

This is the replacement for direct cloud-to-LAN printing. It is also the foundation for later support of multiple printers and printer families.

---

## 3) Non-goals for V1

V1 intentionally does not try to solve every future printing scenario.

Out of scope:

1. polished desktop installer,
2. auto-update system,
3. multi-printer routing UI,
4. kitchen/bar printer routing,
5. USB printer support,
6. Windows service / systemd packaging,
7. printer discovery,
8. advanced offline queue replay,
9. PrintNode compatibility,
10. browser-direct ePOS printing.

Those are future phases once the core cloud-to-local bridge loop is proven.

---

## 4) Architecture Overview

### 4.1 Current working production paths

```text
PDF / email
Browser -> MuseBar Cloud -> PDF / SendGrid
```

```text
Epson Server Direct
Browser -> MuseBar Cloud -> in-memory Epson job queue
Epson TM-Intelligent printer -> polls MuseBar Cloud -> prints
```

### 4.2 Required bridge path

```text
Browser -> MuseBar Cloud -> DB print job queue
Bridge on cashier PC -> polls MuseBar Cloud -> receives job
Bridge -> local printer over LAN -> prints
Bridge -> MuseBar Cloud -> ACK / FAIL
```

Important properties:

1. the bridge only makes outbound HTTPS requests,
2. no router port forwarding is needed,
3. cloud never connects directly to `192.168.x.x`,
4. printer-specific protocols stay local,
5. cloud remains the source of truth for legal document data.

---

## 5) What We Already Have

### 5.1 Data builders

Existing backend code can already build print payload data:

1. receipts from orders,
2. invoices from invoice records,
3. closure bulletins from closure records,
4. business/legal/fiscal metadata.

Relevant area:

```text
MuseBar/backend/src/printing/printDataRepo.ts
MuseBar/backend/src/routes/printing.ts
```

### 5.2 Thermal renderers

Existing renderer options:

1. `BasePrintingService.generateReceiptContent()` builds raw ESC/POS-ish payloads,
2. `BasePrintingService.generateClosureBulletinContent()` builds closure ESC/POS-ish payloads,
3. `eposPrintXml.ts` builds Epson ePOS-Print XML for Server Direct Print.

For bridge V1, use raw ESC/POS payloads because the current Epson TM-m30II accepts TCP printing on port `9100`.

### 5.3 Local socket proof

The temporary `network-escpos` spike proved:

```text
Node process on bar LAN -> TCP 192.168.0.95:9100 -> TM-m30II prints
```

This code is not a production cloud printing solution, but its socket sender is useful bridge implementation material.

Relevant area:

```text
MuseBar/backend/src/services/printing/networkEscPosSocket.ts
MuseBar/backend/src/services/printing/NetworkEscPosPrintService.ts
```

### 5.4 Polling model

The Epson Server Direct path already models the right flow:

```text
enqueue job -> poller asks for work -> return one job -> queue drains
```

For Epson, the poller is the printer.  
For the DIY bridge, the poller is the local bridge process.

Relevant area:

```text
MuseBar/backend/src/services/printing/epsonJobStore.ts
MuseBar/backend/src/printing/epsonPollHandler.ts
MuseBar/backend/src/services/printing/EpsonServerDirectPrintService.ts
```

---

## 6) Cleanup From Temporary LAN Spike

The `network-escpos` provider must not remain presented as a normal production cloud provider.

Reason:

```text
MuseBar Cloud -> 192.168.0.95:9100
```

cannot work from the production cloud server.

Required cleanup:

1. hide or remove `network-escpos` from the production printer setup UI,
2. keep the socket sender logic but move/reuse it in the bridge package,
3. avoid recommending `THERMAL_PRINTER_HOST` as a production cloud environment variable,
4. document `network-escpos` as development/bridge-internal only if it remains in the backend temporarily.

Do not remove Epson Server Direct. It remains valid for compatible printers.

---

## 7) Cloud Backend Design

### 7.1 New provider

Add provider:

```text
bridge
```

When an establishment is configured with `bridge`, print requests do not contact a printer. They enqueue durable jobs in the database.

Example response:

```json
{
  "success": true,
  "message": "Print job queued for MuseBar Bridge",
  "printJobId": "..."
}
```

### 7.2 Durable print job table

Add a database-backed queue instead of relying on in-memory state.

Proposed table:

```sql
CREATE TABLE printing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  payload_format TEXT NOT NULL,
  payload_base64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

Initial allowed values:

```text
document_type: test | receipt | invoice | closure_bulletin
payload_format: escpos
status: pending | claimed | printed | failed | expired
```

V1 can store rendered ESC/POS payloads as base64. This keeps document rendering and fiscal logic in the cloud.

### 7.3 Bridge configuration

V1 can store bridge auth in `printing_configurations.config`.

Example:

```json
{
  "bridgeKey": "secret",
  "printerLabel": "Caisse",
  "defaultPrinter": {
    "driver": "network-escpos",
    "host": "192.168.0.95",
    "port": 9100
  }
}
```

Long-term, bridge devices and printers should move to dedicated tables:

```text
printing_bridges
printing_printers
printing_jobs
```

For V1, avoid over-building unless needed.

---

## 8) Bridge API Design

### 8.1 Poll

```http
GET /api/printing/bridge/poll?establishment_id=<uuid>
x-bridge-key: <secret>
```

Response when no job:

```json
{
  "job": null
}
```

Response when a job exists:

```json
{
  "job": {
    "id": "uuid",
    "document_type": "receipt",
    "payload_format": "escpos",
    "payload_base64": "..."
  }
}
```

Backend behavior:

1. validate establishment id,
2. validate bridge key,
3. find oldest pending job for establishment,
4. atomically mark it `claimed`,
5. return it.

Use row locking:

```sql
FOR UPDATE SKIP LOCKED
```

### 8.2 ACK

```http
POST /api/printing/bridge/jobs/:jobId/ack
x-bridge-key: <secret>
```

Marks:

```text
status = printed
printed_at = now()
```

### 8.3 FAIL

```http
POST /api/printing/bridge/jobs/:jobId/fail
x-bridge-key: <secret>
Content-Type: application/json

{
  "error": "ECONNREFUSED 192.168.0.95:9100"
}
```

Marks failure information and applies retry policy.

---

## 9) Retry Policy

V1 rules:

```text
pending -> claimed -> printed
pending -> claimed -> failed
claimed older than 2 minutes -> pending
failed with attempt_count < 3 -> pending
failed with attempt_count >= 3 -> failed
pending older than configured TTL -> expired
```

Reasoning:

1. bridge may crash after claiming a job,
2. printer may be temporarily offline,
3. duplicate printing should be minimized,
4. failures must be visible to operators.

For fiscal documents, duplicate thermal output is less dangerous than duplicate fiscal numbering because the fiscal event already exists in the cloud. Still, retries should be conservative.

---

## 10) Local Bridge App V1

### 10.1 Package shape

Add a new package:

```text
MuseBar/bridge/
  package.json
  tsconfig.json
  src/
    index.ts
    config.ts
    cloudClient.ts
    printers/
      networkEscpos.ts
```

V1 command:

```bash
npm run bridge
```

### 10.2 Bridge environment

```env
MUSEBAR_API_URL=https://mosehxl.com
ESTABLISHMENT_ID=<uuid>
BRIDGE_KEY=<secret>
PRINTER_DRIVER=network-escpos
PRINTER_HOST=192.168.0.95
PRINTER_PORT=9100
POLL_INTERVAL_MS=2000
```

### 10.3 Bridge loop

Pseudo-code:

```ts
while (true) {
  const job = await poll();
  if (!job) {
    await sleep(POLL_INTERVAL_MS);
    continue;
  }

  try {
    await print(job);
    await ack(job.id);
  } catch (error) {
    await fail(job.id, error);
  }
}
```

### 10.4 Local printer adapter

V1 adapter:

```text
network-escpos
```

Behavior:

```text
decode base64 payload -> TCP write to PRINTER_HOST:PRINTER_PORT -> close socket
```

The sender can reuse the validated logic from `networkEscPosSocket.ts`.

---

## 11) Settings UI V1

Printer setup should show:

```text
MuseBar Bridge
```

V1 fields:

1. bridge label,
2. generated bridge key,
3. establishment id,
4. suggested `.env` snippet,
5. last seen timestamp,
6. pending job count,
7. last error.

Operator flow:

1. select `MuseBar Bridge`,
2. save config,
3. copy `.env` snippet,
4. start local bridge,
5. click test print,
6. verify status.

---

## 12) Security Model

### V1

1. bridge endpoints do not use normal browser JWT,
2. bridge authenticates with `x-bridge-key`,
3. bridge key is scoped to one establishment,
4. key should be randomly generated,
5. key should not be logged,
6. fail/ack endpoints must verify the job belongs to the same establishment.

### Later hardening

1. store only hashed bridge keys,
2. bridge key rotation,
3. bridge device records,
4. last seen + version tracking,
5. per-printer authorization,
6. signed job payloads,
7. mTLS or OAuth device flow if needed.

---

## 13) Observability

Minimum V1 visibility:

1. bridge last seen,
2. bridge app version,
3. pending jobs,
4. claimed jobs older than timeout,
5. last printed job,
6. last failure message,
7. printer endpoint used by bridge.

Backend logs should include:

```text
PRINT_JOB_CREATED
PRINT_JOB_CLAIMED
PRINT_JOB_PRINTED
PRINT_JOB_FAILED
BRIDGE_AUTH_FAILED
```

Avoid logging full payloads or bridge keys.

---

## 14) Product Evolution

V1:

```text
one establishment -> one bridge -> one default receipt printer
```

V2:

```text
one establishment -> one bridge -> multiple printers
```

V3:

```text
one establishment -> multiple bridges -> multiple printer roles
```

Future drivers:

1. `network-escpos` for common LAN receipt printers,
2. `usb-escpos` for USB thermal printers,
3. `cups` for Linux/macOS printer queues,
4. `windows-printer` for Windows queues,
5. `epson-epos-http` for Epson ePOS HTTP devices,
6. `pdf` fallback,
7. `star` printers if needed.

The bridge allows MuseBar to sell printing without forcing a specific printer model.

---

## 15) Implementation Phases

### Phase 1 - Cleanup and model decision

1. keep Epson Server Direct provider,
2. hide/remove direct `network-escpos` as a production cloud provider,
3. keep socket sender logic for bridge reuse,
4. write bridge provider naming into types/config.

### Phase 2 - Durable queue

1. add `printing_jobs` migration,
2. add job repository,
3. add tests for create/claim/ack/fail,
4. add stale-claim recovery helper.

### Phase 3 - Bridge backend provider

1. add `bridge` provider to `PrintingServiceFactory`,
2. render ESC/POS payload in cloud,
3. enqueue jobs into `printing_jobs`,
4. return print job ids to UI,
5. log printing history as queued.

### Phase 4 - Bridge poll API

1. add poll endpoint,
2. add ack endpoint,
3. add fail endpoint,
4. validate bridge key,
5. add route tests.

### Phase 5 - Local bridge app

1. create `MuseBar/bridge`,
2. implement config loading,
3. implement cloud client,
4. implement network ESC/POS printer adapter,
5. implement poll loop,
6. add structured logs.

### Phase 6 - UI and setup

1. add `MuseBar Bridge` provider to Printer Setup,
2. generate bridge key,
3. show bridge `.env` snippet,
4. show status,
5. support test print.

### Phase 7 - Deployment

1. deploy backend migration/routes to production,
2. configure establishment bridge provider,
3. run bridge on cashier PC,
4. test receipt/invoice/closure print,
5. document operational runbook.

---

## 16) Test Plan

### Backend unit/integration tests

1. job creation,
2. claim oldest pending job,
3. skip locked claimed jobs,
4. ack owned job,
5. reject ack for wrong establishment,
6. fail job and retry,
7. bridge auth failure,
8. provider enqueues receipt,
9. provider enqueues invoice,
10. provider enqueues closure bulletin.

### Bridge tests

1. config validation,
2. no-job poll sleeps,
3. successful job prints and ACKs,
4. print failure sends FAIL,
5. cloud unavailable retries without crash,
6. printer unavailable retries/fails cleanly.

### Manual UAT

1. start production/staging backend,
2. start bridge at bar,
3. verify bridge last seen,
4. print test receipt,
5. print real receipt after sale,
6. print invoice,
7. print closure bulletin,
8. stop bridge and verify pending jobs,
9. restart bridge and verify queue drains.

---

## 17) Open Decisions

1. Store rendered ESC/POS in DB or store normalized document data and render in bridge?
   - V1 recommendation: rendered ESC/POS base64 in DB.
2. Keep bridge inside monorepo or separate repository?
   - V1 recommendation: monorepo under `MuseBar/bridge`.
3. Use polling or WebSocket?
   - V1 recommendation: polling every 2 seconds.
4. How to package for cashier PC?
   - V1 recommendation: terminal Node process first; installer later.
5. Should bridge print closures in V1?
   - Recommendation: receipt/invoice first, closure second once queue loop is stable.

---

## 18) Acceptance Criteria for V1

V1 is complete when:

1. production cloud can enqueue a receipt print job,
2. local bridge at Muse Bar can poll and receive the job,
3. bridge prints to TM-m30II over `192.168.0.95:9100`,
4. bridge ACKs success,
5. failed printer connection records a visible failure,
6. no direct cloud-to-LAN printer call remains in the production flow,
7. operator can run the bridge from documented config,
8. Epson Server Direct still works for compatible printers.

---

## 19) Recommended Next Work Item

Start with Phase 1 and Phase 2:

1. hide/remove the temporary direct LAN provider from production UI,
2. add `printing_jobs`,
3. add repository tests,
4. add `bridge` provider that enqueues ESC/POS jobs.

Only after those are stable should the local bridge app be introduced.

