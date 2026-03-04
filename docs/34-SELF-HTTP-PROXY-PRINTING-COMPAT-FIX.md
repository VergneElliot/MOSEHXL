# Fix: Self-HTTP Proxy in Printing Compat (Audit #26)

This doc explains **why** the compatibility layer was using HTTP to call the same server, **what** we changed to use in-process calls, and **how** to avoid self-HTTP proxies in the future.

---

## 1. What was the problem?

**routes/printingCompat.ts** exposed “legacy” thermal-print endpoints (e.g. `POST /api/legal/receipt/:orderId/thermal-print`) and “forwarded” them to the new printing API (`POST /api/printing/receipt/:orderId`) by **making an HTTP request from the server to itself** with `axios`:

```ts
const response = await axios.post(
  `http://localhost:${process.env.PORT || 3001}/api/printing/receipt/${req.params.orderId}`,
  req.body,
  { headers: { ...req.headers, host: undefined }, params: req.query }
);
res.json({ ...response.data, receipt_content: ... });
```

**Why this is a bad idea:**

- **Latency:** Every compat request triggers a full HTTP round-trip (TCP, TLS if any, request/response). That doubles the work and adds delay for no benefit.
- **Fragility:** Depends on the server being up, listening on the expected host/port, and CORS/network not blocking localhost. If the app is behind a proxy or the port is different, the URL is wrong.
- **No real isolation:** You’re not gaining a separate service; you’re just re-entering the same process over the network. Errors and timeouts are harder to reason about.
- **Resource waste:** Extra connections, serialization, and duplicated auth (token sent again to “yourself”).

The right approach is **in-process delegation**: call the same logic (services, DB, helpers) directly from the compat layer instead of going through HTTP.

---

## 2. What we changed

### 2.1 Extracting in-process handlers from the printing router

The printing router (**routes/printing.ts**) already contained the real logic: load receipt/closure data, get the printing service, call `printReceipt` / `printClosureBulletin` / `checkPrinterStatus` / `testPrint`, and return a result. We **extracted** that logic into **exported async functions** that take the same inputs (user, orderId/bulletinId, etc.) and return the same data:

- **getStatusResponse(user)** — returns `{ status, printers, establishment_id }`
- **testPrintResponse(user, printerId?)** — returns the print result
- **printReceiptResponse(user, orderId, type)** — returns `{ result, receiptData }` (throws with `statusCode: 404` if receipt not found)
- **printClosureBulletinResponse(user, bulletinId)** — returns `{ result, bulletinData }` (throws with `statusCode: 404` if bulletin not found)

The printing **route handlers** were refactored to call these functions and then `res.json(...)`. So the router no longer duplicates logic; it just wires HTTP to the shared handlers.

### 2.2 Replacing axios with direct calls in printingCompat

- **Removed** the `axios` dependency from **printingCompat.ts**.
- **Added** the same auth as the main printing API: `authenticateToken` and an `ensureEstablishment` middleware so the compat routes have `req.user` and `establishment_id`.
- Each compat route now:
  1. Runs auth and establishment check.
  2. Calls the corresponding handler from **routes/printing.ts** (e.g. `printReceiptResponse(user, orderId, type)`).
  3. Maps the return value to the **legacy response shape** (e.g. `success`, `message`, `receipt_data`, `receipt_content`) and sends it with `res.json(...)`.
  4. Catches errors (including 404) and sends the appropriate status and body.

So the compat layer no longer performs any HTTP request to the same server; it just calls the same code path in-process and adapts the response format.

### 2.3 Mounting the routes in app

- **app.ts** now mounts:
  - **`/api/printing`** → printing router (main printing API).
  - **`/`** → printingCompat router (so paths like `/api/legal/receipt/:orderId/thermal-print` match the compat routes).

Previously, neither router was mounted, so the compat and the main printing API were effectively dead. They are now active and the compat layer uses only in-process calls.

---

## 3. How to verify

1. **Backend build:** From `MuseBar/backend`, run `npm run build`. It should succeed; there are no remaining `axios` calls in printingCompat.
2. **Search for self-calls:** `grep -r "localhost.*PORT\|axios.*api/printing" MuseBar/backend/src` should show no compat-related self-HTTP.
3. **Behaviour:** With the server running, call the legacy compat endpoints with a valid JWT and establishment context (e.g. `POST /api/legal/receipt/1/thermal-print`). Responses should match the previous “forwarded” shape (e.g. `success`, `receipt_data`, `receipt_content`) without any internal HTTP request.

---

## 4. Takeaway

- **Avoid self-HTTP:** When one part of your server needs the “same” API as another, **call the same logic in-process** (shared functions, services, or handlers), not via HTTP to localhost.
- **Share logic, not URLs:** Extract the core behaviour into callable functions or services; let route handlers (current and compat) only do auth, parameter mapping, and response shaping.
- **Compat layers** should be thin adapters: same auth, same core calls, different URL and response format. No network hop.
