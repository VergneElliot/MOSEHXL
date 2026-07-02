# 431 - Cleanup Phase 4F: printing routes modularization - Plan

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`

---

## 1) Goal

Complete Track A Phase 4 by splitting `MuseBar/backend/src/routes/printing.ts` (~735 LOC)
into focused modules. **No behavior, mount path, or API contract changes.**

This follows the same pattern used for `authLogin.ts` (Phases 4A–4E): extract shared
infrastructure first, then route groups, leave a thin assembler file.

---

## 2) Current problems

| Issue | Detail |
|-------|--------|
| Size | Single file mixes bridge auth, Epson poll, JWT routes, in-process handlers, PDF/email export |
| Concerns | Transport (Express handlers) interleaved with orchestration (`printReceiptResponse`, etc.) |
| Coupling | `printingCompat.ts` imports in-process handlers from the same route file |

---

## 3) Target layout

```text
MuseBar/backend/src/routes/printing/
  bridgeAuth.ts           Bridge key validation (x-bridge-key)
  context.ts              Printing user, establishment middleware, service manager
  handlers.ts             In-process handlers exported to printingCompat
  documentHelpers.ts      PDF/XLSX response helpers + shared document error mapping
  epsonRoutes.ts          GET /epson/poll
  bridgeRoutes.ts         GET /bridge/poll, POST ack/fail, GET /bridge/status
  statusRoutes.ts         GET /status, /printers; POST /test
  documentRoutes.ts       Receipt, closure, invoice preview + print
  documentExportRoutes.ts PDF, email, XLSX export routes
  configurationRoutes.ts  GET/POST /configuration
  historyRoutes.ts        GET /history

MuseBar/backend/src/routes/printing.ts   Thin assembler + handler re-exports
```

`app.ts` continues to mount `printingRouter` at `/api/printing`. External paths unchanged.

---

## 4) Extraction steps (execution order)

1. **Shared infrastructure**
   - `bridgeAuth.ts` — `safeEquals`, `validateBridgeRequest`
   - `context.ts` — `getPrintingUser`, `ensureEstablishment`, `getPrintingService`, service manager singleton
   - `documentHelpers.ts` — download helpers + `mapDocumentRouteError`
   - `handlers.ts` — `getStatusResponse`, `testPrintResponse`, `printReceiptResponse`, `printClosureBulletinResponse`, `printInvoiceResponse`

2. **Route groups** (each exports a `Router` mounted at `/` on the parent)
   - `epsonRoutes.ts`
   - `bridgeRoutes.ts`
   - `statusRoutes.ts`
   - `documentRoutes.ts`
   - `documentExportRoutes.ts`
   - `configurationRoutes.ts`
   - `historyRoutes.ts`

3. **Assembler**
   - Replace `printing.ts` body with `router.use(...)` mounts
   - Re-export handlers for `printingCompat.ts`

4. **Compat import** (optional cleanup)
   - Point `printingCompat.ts` at `./printing/handlers` or keep importing from `./printing` via re-exports

---

## 5) Verification plan

From `MuseBar/backend`:

1. `npx vitest run src/routes/printing.routes.test.ts`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. Confirm `printing.ts` assembler is well under 500 LOC; no child file exceeds ~250 LOC

---

## 6) Out of scope

- Provider implementation changes (`services/printing/*`)
- Bridge poll/ack semantics
- New endpoints or permission changes
- Track B performance work (Phase 5+)

---

## 7) Rollback

Revert the commit; `printing.ts` is restored as the single file. No migration or schema impact.
