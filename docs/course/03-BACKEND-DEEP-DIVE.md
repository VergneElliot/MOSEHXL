# Chapter 3 — Backend Deep Dive

This chapter explains Express.js, middleware, routes, models, and services — the building blocks of the API.

---

## What Is Express.js?

Express is a **web framework** for Node.js. It handles the boring parts of building an API: listening for HTTP requests, parsing request bodies, routing URLs to handler functions, sending responses.

Without Express, you'd write raw Node.js HTTP code. Express wraps it into a clean API:

```typescript
// Without Express (raw Node.js) — painful
const http = require('http');
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/products') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([...]));
  }
}).listen(3001);

// With Express — clean
const app = express();
app.get('/api/products', (req, res) => {
  res.json([...]);
});
app.listen(3001);
```

### The app object

`app.ts` creates the Express application:

```typescript
const app = express();
```

This `app` is the central object. You attach middleware and routes to it. When a request arrives, Express runs through all attached middleware and routes in order until one sends a response.

---

## Middleware — The Assembly Line

Middleware is the most important concept in Express. A middleware is a function that runs **before** your route handler. Think of it as an assembly line — each station does one thing and passes the request to the next station.

```typescript
// Signature of any middleware function:
(req: Request, res: Response, next: NextFunction) => void
```

- `req` — the incoming request (URL, headers, body, etc.)
- `res` — the outgoing response (you call `res.json()` to send data back)
- `next` — a function you call to pass to the next middleware. If you don't call `next()`, the request stops here.

### How middleware runs in our app

In `app.ts`, middleware is attached in order:

```typescript
app.use(cors({ ... }));                          // 1. Check CORS origin
app.use(express.json());                          // 2. Parse JSON body
app.use(requestLoggerMiddleware(logger));          // 3. Log the request
app.use(createSecurityMiddleware(config, logger)); // 4. Rate limit, sanitize, etc.

app.use('/api/orders', ordersRouter);              // 5. Route to the right handler
```

For every request, steps 1-4 always run. Step 5 only runs if the URL starts with `/api/orders`. This is how middleware creates a pipeline.

### Example: authentication middleware

`requireAuth` in `routes/auth.ts` is a middleware:

```typescript
export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;     // Get the "Authorization: Bearer xxx" header
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' }); // Stop here — no next()
  }
  const payload = jwt.verify(auth.slice(7), JWT_SECRET);     // Verify the JWT
  req.user = payload;                                          // Attach user info to request
  next();                                                      // Continue to the route handler
}
```

Routes that need authentication use it:
```typescript
router.post('/register', requireAuth, requireAdmin, async (req, res) => { ... });
//                        ^^^^^^^^^^ ^^^^^^^^^^^^^
//                        middleware  middleware
//                        runs first runs second
//                                              then the handler runs
```

If `requireAuth` rejects (sends 401), `requireAdmin` never runs. If `requireAuth` passes, `requireAdmin` checks `req.user.is_admin`. If that passes, the handler runs.

---

## Routes — The Door Map

A **route** maps a URL + HTTP method to a handler function.

```typescript
// GET /api/products → return all products
router.get('/', async (req, res) => {
  const products = await ProductModel.getAll();
  res.json(products);
});

// POST /api/products → create a product
router.post('/', async (req, res) => {
  const product = await ProductModel.create(req.body);
  res.status(201).json(product);
});

// PUT /api/products/:id → update a specific product
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);  // :id from URL
  const product = await ProductModel.update(id, req.body);
  res.json(product);
});
```

The `:id` is a **route parameter**. If someone requests `PUT /api/products/5`, then `req.params.id` is `"5"`.

### Router composition

Express lets you create mini-routers and mount them:

```typescript
// In app.ts:
app.use('/api/orders', ordersRouter);

// ordersRouter is defined in routes/orders/index.ts:
const router = express.Router();
router.use('/', orderCRUDRouter);         // /api/orders/*
router.use('/payment', orderPaymentRouter); // /api/orders/payment/*
router.use('/legal', orderLegalRouter);     // /api/orders/legal/*
```

This is how we split one big route file into four focused files while keeping the same URL structure.

---

## Models — Talking to the Database

Models wrap raw SQL queries in TypeScript functions. Each model corresponds roughly to one database table.

```typescript
// models/index.ts
export const OrderModel = {
  async getAll(): Promise<Order[]> {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return result.rows;
  },

  async create(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    const result = await pool.query(`
      INSERT INTO orders (total_amount, total_tax, payment_method, status, notes, tips, change)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [order.total_amount, order.total_tax, order.payment_method, order.status,
        order.notes, order.tips, order.change]);
    return result.rows[0];
  },
};
```

### The `pool` object

`pool` is a PostgreSQL **connection pool**. Instead of opening a new database connection for every query (slow), the pool keeps several connections open and reuses them:

```typescript
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || DEFAULT_DB_NAME,
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});
```

Every `pool.query(sql, params)` grabs a connection, runs the query, and returns it.

### Parameterized queries (SQL injection prevention)

Never do this:
```typescript
// DANGEROUS — SQL injection:
pool.query(`SELECT * FROM users WHERE email = '${email}'`);
// If email = "'; DROP TABLE users; --" you just lost your database
```

Always do this:
```typescript
// SAFE — parameterized:
pool.query('SELECT * FROM users WHERE email = $1', [email]);
// $1 is replaced by the value of email, properly escaped
```

Every query in our models uses `$1`, `$2`, etc. PostgreSQL handles escaping.

### The `RETURNING *` trick

PostgreSQL's `RETURNING *` clause returns the row after INSERT/UPDATE:

```sql
INSERT INTO orders (total_amount) VALUES (15.00) RETURNING *;
-- Returns: { id: 42, total_amount: 15.00, created_at: '2026-02-25T17:30:00Z', ... }
```

This saves us from doing a separate `SELECT` after every insert.

---

## Services — Complex Business Logic

Sometimes an operation involves multiple models, external APIs, or complex logic. That goes in a **service**. The route handler stays thin — it just calls the service.

Example: `services/email/EmailService.ts` — sending an email involves:
1. Loading the right template
2. Replacing variables (user name, establishment name, etc.)
3. Calling the SendGrid API
4. Logging the result to `email_logs` table

That's too much for a route handler. The route just calls `EmailService.sendInvitation(...)`.

In contrast, simple CRUD operations don't need a service — the route calls the model directly.

---

## Validation Middleware

`middleware/validation.ts` provides reusable validation:

```typescript
export const validateBody = (validationRules: ValidationRule[]) => {
  return (req, res, next) => {
    const errors = [];
    for (const rule of validationRules) {
      const value = req.body[rule.field];
      if (rule.required && !value) {
        errors.push(`Field '${rule.field}' is required`);
      }
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message);
      }
    }
    if (errors.length > 0) {
      return next(new AppError(`Validation errors: ${errors.join(', ')}`, 400));
    }
    next();
  };
};
```

It's a **middleware factory** — a function that returns a middleware function. You use it like:

```typescript
router.post('/',
  validateBody(commonValidations.orderCreate),  // validation middleware
  async (req, res) => { ... }                    // route handler
);
```

The validation runs before the handler. If validation fails, the handler never executes.

---

## Error Handling

In Express, errors flow to **error-handling middleware** — a special middleware with four arguments (yes, four — the extra `err` argument is how Express distinguishes error middleware from regular middleware):

```typescript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});
```

In our project, the unified error system lives in `middleware/errorHandler.ts`. It provides:

1. **An error class hierarchy** — different error types for different situations:

```typescript
throw new ValidationError('Invalid email');     // → 400 Bad Request
throw new AuthenticationError('Token expired');  // → 401 Unauthorized
throw new AuthorizationError('No permission');   // → 403 Forbidden
throw new NotFoundError('Order not found');      // → 404 Not Found
throw new ConflictError('Email already exists'); // → 409 Conflict
throw new RateLimitError('Too many requests');   // → 429 Too Many Requests
throw new BusinessLogicError('Cannot refund');   // → 422 Unprocessable Entity
```

All of these extend `AppError`, which has a `statusCode` and `isOperational` flag. The global error handler knows how to format them into clean JSON responses.

2. **Error normalization** — the handler automatically converts common errors:
   - PostgreSQL error code `23505` → `ConflictError` (duplicate key violation)
   - JWT `TokenExpiredError` → `AuthenticationError` with "Token expired"
   - Network `ECONNREFUSED` → "Database connection failed"

3. **The `asyncHandler` wrapper** — because Express doesn't catch errors from `async` functions by default:

```typescript
// Without asyncHandler — errors in async code crash the server:
router.get('/', async (req, res) => {
  const orders = await OrderModel.getAll(); // if this throws, Express doesn't catch it
  res.json(orders);
});

// With asyncHandler — errors are properly caught:
router.get('/', asyncHandler(async (req, res) => {
  const orders = await OrderModel.getAll(); // if this throws, error handler catches it
  res.json(orders);
}));
```

4. **The `notFound` middleware** — runs after all routes. If no route matched the URL, it sends a 404:

```typescript
export const notFound = (req, res, next) => {
  next(new AppError(`Not found: ${req.originalUrl}`, 404));
};
```

---

## The Request/Response Lifecycle

Every HTTP request to the backend goes through this sequence:

```
Incoming request
    │
    ▼
[1] CORS middleware — is the origin allowed?
    │
    ▼
[2] express.json() — parse the body from raw text to JavaScript object
    │
    ▼
[3] Request logger — log the request
    │
    ▼
[4] Security middleware — rate limit check, input sanitization
    │
    ▼
[5] Router matching — find the right route handler
    │
    ▼
[6] Route-specific middleware (requireAuth, validateBody)
    │
    ▼
[7] Route handler — the actual business logic
    │
    ▼
[8] res.json() sends the response
    │
    OR if an error was thrown:
    │
    ▼
[9] Error handler middleware — sends error response
```

If any middleware calls `res.status(401).json(...)` without calling `next()`, the chain stops there.

---

## async/await — Handling Asynchronous Code

Database queries, HTTP calls, and file operations don't complete instantly. They're **asynchronous** — they take time. JavaScript uses `async/await` to handle this:

```typescript
// Without async/await (callback hell):
pool.query('SELECT * FROM orders', (err, result) => {
  if (err) {
    console.error(err);
  } else {
    pool.query('SELECT * FROM order_items WHERE order_id = ' + result.rows[0].id, (err2, items) => {
      // nested deeper and deeper...
    });
  }
});

// With async/await (clean):
const result = await pool.query('SELECT * FROM orders');
const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [result.rows[0].id]);
```

`await` pauses the function until the async operation completes. The function must be marked `async`:

```typescript
router.get('/', async (req, res) => {   // ← async
  const orders = await OrderModel.getAll();  // ← await pauses here until DB responds
  res.json(orders);                           // ← runs after DB responds
});
```

If the `await` fails (DB error, network error), it throws an exception, which is caught by `try/catch` or the error-handling middleware.

---

---

## Structured Logging

Instead of using `console.log` (which produces unstructured output that's hard to search and filter), the backend uses a **structured logging system** in `utils/logger/`. This system:

- Categorizes log messages (AUTH, DATABASE, SECURITY, LEGAL, etc.)
- Includes timestamps, severity levels (DEBUG, INFO, WARN, ERROR)
- Logs request details (method, URL, duration, status code) via request logger middleware
- In production, omits debug-level messages for performance

Every debug `console.log` statement was replaced with the structured logger during the audit (see [patch note #33](../patch-notes/33-DEBUG-CONSOLE-LOG-AUDIT-25-FIX.md)). If you need to add logging, use the logger, not `console.log`.

---

## Summary

| Concept | What it does | Our code |
|---------|-------------|----------|
| Express | Web framework — handles HTTP | `app.ts` creates the app |
| Middleware | Functions that run before route handlers | `auth.ts`, `validation.ts`, `security/` |
| Routes | Map URLs to handler functions | `routes/orders/`, `routes/legal/` |
| Models | Wrap SQL queries in TypeScript | `models/database/`, `models/user.ts` |
| Services | Complex multi-step business logic | `services/email/`, `services/setup/` |
| Pool | Reusable database connections | `pool` in `app.ts` |
| Parameterized queries | Prevent SQL injection | `$1`, `$2` in every query |
| async/await | Clean asynchronous code | Every route handler and model function |
| AppError hierarchy | Typed errors with proper HTTP status codes | `middleware/errorHandler.ts` |
| asyncHandler | Catches errors from async route handlers | Wraps every async route handler |
| Structured logger | Categorized, timestamped logging (no console.log) | `utils/logger/` |
