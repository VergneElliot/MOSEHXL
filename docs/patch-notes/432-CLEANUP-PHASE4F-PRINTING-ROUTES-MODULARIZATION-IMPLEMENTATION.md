# 432 - Cleanup Phase 4F: printing routes modularization - Implementation

Date: 2026-07-01  
Roadmap reference: `docs/roadmaps/2026-06-24-CLEANUP-AND-PERFORMANCE-ROADMAP.md`  
Plan: `docs/patch-notes/431-CLEANUP-PHASE4F-PRINTING-ROUTES-MODULARIZATION-PLAN.md`

---

## 1) Context

Phase 4F completes Track A modularization. `printing.ts` was the last large backend
route file (~735 LOC) mixing bridge auth, Epson poll, JWT-protected print routes,
in-process handlers, and PDF/email export helpers.

This pass mirrors the `authLogin` split: extract shared infrastructure and route
groups, leave a thin assembler, preserve all mount paths and handler exports.

---

## 2) What changed

### New `routes/printing/` modules

| File | Responsibility |
|------|----------------|
| `bridgeAuth.ts` | `validateBridgeRequest`, timing-safe bridge key compare |
| `context.ts` | `getPrintingUser`, `ensureEstablishment`, printing service manager |
| `handlers.ts` | In-process handlers used by routes and `printingCompat.ts` |
| `documentHelpers.ts` | PDF/XLSX download helpers, shared document error mapping |
| `epsonRoutes.ts` | `GET /epson/poll` |
| `bridgeRoutes.ts` | Bridge poll, ack, fail, status |
| `statusRoutes.ts` | Status, printers, test print |
| `documentRoutes.ts` | Receipt, closure, invoice preview + print |
| `documentExportRoutes.ts` | PDF, email, XLSX export routes |
| `configurationRoutes.ts` | GET/POST `/configuration` |
| `historyRoutes.ts` | GET `/history` |

### Assembler `routes/printing.ts`

Replaced the monolith with:

```text
router.use(epsonRoutes)
router.use(bridgeRoutes)
router.use(statusRoutes)
router.use(documentRoutes)
router.use(documentExportRoutes)
router.use(configurationRoutes)
router.use(historyRoutes)
```

Re-exports handlers for `printingCompat.ts`:

- `getStatusResponse`
- `testPrintResponse`
- `printReceiptResponse`
- `printClosureBulletinResponse`
- `printInvoiceResponse`

Line-count result:

```text
Before Phase 4F: printing.ts ~735 LOC (single file)
After Phase 4F:  printing.ts 29 LOC (assembler)
                 largest child: documentRoutes.ts 180 LOC
```

`app.ts` still mounts the router at `/api/printing`. No API path changes.

---

## 3) Verification

Executed from `MuseBar/backend`:

1. `npm run type-check` — pass
2. `npm run lint` — pass
3. `npx vitest run src/routes/printing.routes.test.ts` — pass
4. `npm test` — 80 files / 324 tests passed
5. IDE diagnostics on edited printing files — no linter errors

---

## 4) Outcome

Phase 4F completes the cleanup roadmap **Track A** modularization. The printing
route surface is unchanged; code is split into reviewable modules under 200 LOC
each. **Track B (performance baseline)** is the recommended next resume point.

---

## 5) Rollback

Revert this commit. No schema or migration impact.
