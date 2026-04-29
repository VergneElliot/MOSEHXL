# Chapter 2 — Architecture Overview

This chapter explains why the project is structured the way it is, what each folder does, and how a single user action flows through the entire system.

---

## The Big Picture

This is a **client-server** application. Two completely separate programs talk to each other over HTTP:

```
┌─────────────────────────┐          HTTP          ┌─────────────────────────┐
│                         │  ◄──── requests ────►  │                         │
│   FRONTEND (React)      │                         │   BACKEND (Express)     │
│   Port 3000             │                         │   Port 3001             │
│                         │                         │                         │
│   Runs in the browser   │                         │   Runs on the server    │
│   Shows the UI          │                         │   Handles business      │
│   Sends API requests    │                         │   logic and database    │
│                         │                         │                         │
└─────────────────────────┘                         └────────────┬────────────┘
                                                                 │
                                                                 │ SQL queries
                                                                 ▼
                                                    ┌─────────────────────────┐
                                                    │                         │
                                                    │   PostgreSQL Database   │
                                                    │   Port 5432             │
                                                    │                         │
                                                    └─────────────────────────┘
```

The frontend knows **nothing** about the database. The backend knows **nothing** about the UI. They only communicate through API calls (JSON over HTTP). This separation is fundamental — it means you could replace the entire frontend with a mobile app and the backend would work unchanged.

---

## Folder Structure Explained

```
MOSEHXL/
│
├── MuseBar/
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app.ts                 ← The entry point. Sets up Express, connects DB, mounts routes
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── environment.ts     ← Reads .env, validates, creates typed config
│   │   │   │   └── timezone.ts        ← DEFAULT_APP_TIMEZONE = 'Europe/Paris'
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts            ← JWT verification — "is this request from a logged-in user?"
│   │   │   │   ├── validation.ts      ← Request body/param validation rules
│   │   │   │   ├── errorHandler.ts    ← Unified error types (AppError hierarchy) and global error handler
│   │   │   │   └── security/          ← Rate limiting (PostgreSQL-backed), CORS, input sanitization, security headers
│   │   │   │
│   │   │   ├── routes/                ← API endpoints — the "doors" the frontend knocks on
│   │   │   │   ├── auth.ts            ← /api/auth/* (login, register, /me)
│   │   │   │   ├── categories.ts      ← /api/categories/* (CRUD)
│   │   │   │   ├── products.ts        ← /api/products/* (CRUD)
│   │   │   │   ├── orders/            ← /api/orders/* (split into CRUD, payment, legal, audit)
│   │   │   │   ├── legal/             ← /api/legal/* (split into journal, closure, compliance, archive)
│   │   │   │   ├── userManagement/    ← /api/user-management/* (roles, team, invitations)
│   │   │   │   └── ...                ← establishments, setup, admin dashboard
│   │   │   │
│   │   │   ├── models/                ← Database queries — "how to talk to PostgreSQL"
│   │   │   │   ├── index.ts           ← CategoryModel, ProductModel, OrderModel, etc.
│   │   │   │   ├── user.ts            ← UserModel (create, find, verify password)
│   │   │   │   ├── legalJournal/      ← Legal journal operations (add entry, verify chain)
│   │   │   │   ├── auditTrail.ts      ← Audit trail logging
│   │   │   │   └── *.sql              ← SQL schema definitions
│   │   │   │
│   │   │   ├── services/              ← Business logic that doesn't belong in routes or models
│   │   │   │   ├── email/             ← SendGrid email sending
│   │   │   │   ├── establishment/     ← Establishment creation, validation, search
│   │   │   │   ├── setup/             ← Setup wizard multi-step flow
│   │   │   │   ├── printing/          ← Multi-method printing
│   │   │   │   └── receipts/          ← Digital, email, QR receipts
│   │   │   │
│   │   │   ├── utils/                 ← Shared utilities
│   │   │   │   ├── logger/            ← Structured logging system
│   │   │   │   └── closureScheduler.ts ← Cron-like daily closure automation
│   │   │   │
│   │   │   └── migrations/            ← Database schema version management
│   │   │
│   │   ├── package.json               ← Backend dependencies and scripts
│   │   └── tsconfig.json              ← TypeScript compiler configuration
│   │
│   ├── src/
│   │   ├── App.tsx                    ← Root component — routing, auth detection
│   │   ├── index.tsx                  ← React entry point — mounts App into the HTML page
│   │   │
│   │   ├── components/
│   │   │   ├── POS/                   ← Point of sale (product grid, cart, payment dialog)
│   │   │   ├── Menu/                  ← Category/product management
│   │   │   ├── History/               ← Order history and stats
│   │   │   ├── Settings/              ← Business settings, closure config
│   │   │   ├── Legal/                 ← Legal compliance dashboard, receipts
│   │   │   ├── Closure/               ← Closure bulletin management
│   │   │   ├── HappyHour/            ← Happy hour configuration
│   │   │   ├── auth/                  ← Login and auth-related components
│   │   │   ├── Admin/                 ← User management, audit trail
│   │   │   ├── SystemAdmin/           ← System admin interface (establishments, system users)
│   │   │   ├── Setup/                 ← Business setup wizard
│   │   │   └── common/               ← Shared components (AppRouter, ErrorBoundary, loaders)
│   │   │
│   │   ├── hooks/                     ← Custom React hooks — reusable state and logic
│   │   │   ├── usePOSState.ts         ← POS screen state (cart, dialogs, payment)
│   │   │   ├── usePOSLogic.ts         ← POS calculations (totals, filtering, validation)
│   │   │   ├── usePOSAPI.ts           ← POS API calls (create order, process retour)
│   │   │   ├── useAuth.ts             ← Authentication state (login, logout, token)
│   │   │   └── ...                    ← Same pattern for History, Menu, HappyHour, etc.
│   │   │
│   │   ├── services/
│   │   │   ├── apiService.ts          ← Central API service (HTTP calls to backend)
│   │   │   ├── api/                   ← Domain-specific API modules (categories, products, etc.)
│   │   │   ├── dataService.ts         ← Data loading and caching
│   │   │   └── happyHourService.ts    ← Happy hour time calculation
│   │   │
│   │   ├── types/                     ← TypeScript interfaces (what data looks like)
│   │   │   ├── business.ts            ← Category, Product, HappyHourSettings
│   │   │   ├── orders.ts             ← Order, OrderItem, PaymentMethod
│   │   │   ├── auth.ts               ← User, AuthResponse
│   │   │   └── ...
│   │   │
│   │   └── config/
│   │       └── api.ts                 ← API URL detection (localhost vs production)
│   │
│   ├── package.json                   ← Frontend dependencies and scripts
│   └── tsconfig.json                  ← TypeScript config
│
├── scripts/                           ← Shell scripts for setup and deployment
├── backups/                           ← Database backup files
├── docs/                              ← Documentation hub
│   ├── course/                        ← Learning guide (chapters 01-10)
│   └── patch-notes/                   ← Fix documentation (45 patches from code audit)
├── README.md                          ← Project overview
└── DEVELOPMENT-STATE.md               ← Current state and fix list
```

---

## How a Request Flows Through the System

Let's trace what happens when a bartender clicks "Pay" for a 15€ card payment.

### Step 1 — Frontend: User clicks the button

In `PaymentDialogContainer.tsx`, the "Confirmer" button calls `paymentLogic.handleSimplePayment()`.

### Step 2 — Frontend: Hook prepares the data

`usePaymentProcessing.ts` assembles the order data:
```typescript
{
  totalAmount: 15.00,
  totalTax: 2.50,
  paymentMethod: 'card',
  items: [{ productId: 1, productName: 'Heineken 33cl', quantity: 2, ... }],
  tips: 0,
  change: 0
}
```

### Step 3 — Frontend: API service sends HTTP request

`usePOSAPI.ts` calls `apiService.post('/orders', { ... })`, which translates to:

```
POST http://localhost:3001/api/orders
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiI...

{
  "total_amount": 15.00,
  "total_tax": 2.50,
  "payment_method": "card",
  "status": "completed",
  "items": [ ... ]
}
```

### Step 4 — Backend: Express receives the request

Express matches the URL `/api/orders` to `ordersRouter` (defined in `app.ts`), then matches `POST /` in `orderCRUD.ts`.

### Step 5 — Backend: Middleware runs first

Before the route handler, these run in order:
1. **CORS** — checks the request origin is allowed
2. **express.json()** — parses the JSON body into `req.body`
3. **Request logger** — logs the request
4. **Security middleware** — rate limiting, input sanitization
5. **Validation middleware** — checks required fields exist and are valid types

### Step 6 — Backend: Route handler creates the order

`orderCRUD.ts` calls the model:
```typescript
const order = await OrderModel.create({ ... });  // INSERT INTO orders
for (const item of items) {
  await OrderItemModel.create({ ... });           // INSERT INTO order_items
}
```

### Step 7 — Backend: Model executes SQL

`OrderModel.create` in `models/index.ts` runs:
```sql
INSERT INTO orders (total_amount, total_tax, payment_method, status, notes, tips, change)
VALUES (15.00, 2.50, 'card', 'completed', '', 0, 0)
RETURNING *
```

PostgreSQL inserts the row and returns the complete row (including the auto-generated `id` and `created_at`).

### Step 8 — Backend: Response sent

The route handler sends back JSON:
```json
{
  "id": 42,
  "total_amount": 15.00,
  "items": [ ... ],
  "created_at": "2026-02-25T17:30:00Z"
}
```

### Step 9 — Frontend: Success handler runs

`onOrderComplete('Commande créée avec succès')` fires, the cart clears, and the user sees a green success snackbar.

---

## Layered Architecture

The backend follows a **layered architecture**. Each layer has one job and only talks to the layer below it:

```
┌─────────────────────────────────────────┐
│              ROUTES                     │  "What endpoints exist?"
│  Receives HTTP requests, sends          │  Maps URLs to handler functions
│  responses. Calls models/services.      │
├─────────────────────────────────────────┤
│              MIDDLEWARE                  │  "What checks run on every request?"
│  Auth, validation, rate limiting.       │  Runs before route handlers
│  Can reject requests early.             │
├─────────────────────────────────────────┤
│              SERVICES (optional)        │  "Complex business logic"
│  Orchestrates multiple operations.      │  Used for email, setup wizard, etc.
│  Not all routes need a service layer.   │
├─────────────────────────────────────────┤
│              MODELS                     │  "How to read/write the database"
│  SQL queries wrapped in TypeScript      │  One model per table (roughly)
│  functions. Returns typed objects.       │
├─────────────────────────────────────────┤
│              DATABASE (PostgreSQL)       │  "Where data lives"
│  Tables, indexes, constraints,          │  Accessed only through models
│  triggers for legal protection          │
└─────────────────────────────────────────┘
```

Why layers? Because each layer can change independently. You could switch from PostgreSQL to MySQL by only rewriting the models. You could change the API URL structure by only changing routes. The UI could be completely replaced without touching the backend.

---

## Why Modular?

The V1 code had single files of 1200+ lines doing everything. V2 breaks things down:

**V1 (monolith):** One `orders.ts` route file — 1213 lines — handles CRUD, payment, cancellation, retour, legal journal, audit trail.

**V2 (modular):**
- `orders/orderCRUD.ts` — 200 lines — just CRUD
- `orders/orderPayment.ts` — 300 lines — just retour and cancellation
- `orders/orderLegal.ts` — 117 lines — just legal journal endpoints
- `orders/orderAudit.ts` — 110 lines — just audit trail endpoints
- `orders/index.ts` — 20 lines — glues them together

The advantage: when you need to fix a bug in cancellations, you open `orderPayment.ts` (300 lines) instead of hunting through 1213 lines. When you need to understand the audit trail, you read a 110-line file instead of extracting it mentally from a massive file.

---

## Frontend Architecture Pattern

The frontend uses the same principle — each screen has three concerns split into separate hooks:

```
┌─────────────────────────────┐
│     POSContainer.tsx        │  The component — renders UI, handles events
│     (the "view")            │
├──────────┬──────────┬───────┤
│ usePOS   │ usePOS   │usePOS │
│ State    │ Logic    │ API   │
│          │          │       │
│ What     │ How      │ Where │
│ data     │ to       │ to    │
│ exists   │ calculate│ fetch │
│          │ and      │ and   │
│ (cart,   │ filter   │ send  │
│  dialog  │ (totals, │ data  │
│  flags)  │  search) │       │
└──────────┴──────────┴───────┘
```

This pattern (called **separation of concerns**) means:
- `usePOSState` manages what's on screen (cart items, dialog open/closed, payment method selected)
- `usePOSLogic` computes derived values (filtered products, order total, tax, "can we pay?")
- `usePOSAPI` makes HTTP calls (create order, process return)
- `POSContainer` ties them together and renders the UI

If the API changes, you only touch `usePOSAPI`. If the calculation logic changes, you only touch `usePOSLogic`. If the UI changes, you only touch the component.

---

## Data Flow Diagram

Here's how data flows through the entire system for a typical POS workflow:

```
USER ACTION          FRONTEND                         BACKEND                    DATABASE
───────────────────────────────────────────────────────────────────────────────────────────

Login            →   useAuth.login()
                     POST /api/auth/login        →   routes/auth.ts
                                                     UserModel.findByEmail()  → SELECT FROM users
                                                     jwt.sign()               
                     ← { token, user }           ←   ← user row
                     localStorage.setItem()

Load products    →   useDataManagement()
                     GET /api/products           →   routes/products.ts
                                                     ProductModel.getAll()    → SELECT FROM products
                     ← Product[]                 ←   ← product rows

Add to cart      →   usePOSState.addToOrder()
                     (local state only — no API call)

Click "Pay"      →   usePaymentProcessing.handleSimplePayment()
                     POST /api/orders            →   routes/orders/orderCRUD.ts
                                                     OrderModel.create()      → INSERT INTO orders
                                                     OrderItemModel.create()  → INSERT INTO order_items
                     ← { order + items }         ←   ← new rows

Load history     →   useHistoryAPI.loadOrders()
                     GET /api/orders             →   routes/orders/orderCRUD.ts
                                                     OrderModel.getAll()      → SELECT FROM orders
                     ← Order[]                   ←   ← order rows

Daily closure    →   ClosureContainer
                     POST /api/legal/closure/daily → routes/legal/closure.ts
                                                     LegalJournalModel        → INSERT INTO
                                                       .createDailyClosure()    closure_bulletins
                     ← closure bulletin          ←   ← new bulletin row
```

---

## Summary

| Concept | Why it exists | Where to find it |
|---------|---------------|------------------|
| Client-server separation | Frontend and backend can change independently | `MuseBar/src/` vs `MuseBar/backend/` |
| Layered architecture | Each layer has one job | routes → middleware → services → models → DB |
| Modular routes | Small, focused files instead of monoliths | `routes/orders/`, `routes/legal/` |
| Hook-based frontend | State, logic, and API calls separated | `hooks/usePOS*.ts`, `hooks/useHistory*.ts` |
| TypeScript types | Catch bugs at compile time, not runtime | `types/`, interfaces in every file |
