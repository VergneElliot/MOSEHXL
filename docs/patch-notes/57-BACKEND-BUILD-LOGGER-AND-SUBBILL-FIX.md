# Patch 57 — Backend Build Fix: Logger Signature and SubBill Type

This patch fixes the **backend TypeScript build** that was failing with 20 errors after the technical audit (Patch 56). The issues were: (1) the way we called the structured logger did not match its real **signature**, and (2) the type of `payment_method` when creating sub-bills was too loose. Both are fixed in a way that matches the existing architecture and good practices.

---

## 1. What was the problem?

Running `npm run build` in the backend produced errors in five files:

- **Logger errors:** “Argument of type '{}' is not assignable to parameter of type 'string'.” (and similar for `{ orderId: number }`).
- **SubBill error:** “Type 'string' is not assignable to type '"cash" | "card"'” in `orderCRUD.ts` when creating sub-bills.

So the build was failing for two separate reasons: **how we call the logger** and **what type we pass for payment_method**.

---

## 2. Understanding “signature” and why the logger failed

### 2.1 What is a function signature?

The **signature** of a function is the contract: the number and types of its parameters (and sometimes the return type). For example:

- “First argument: string. Second: number. Third: optional string.”  
If you pass a **number** where a **string** is expected, TypeScript reports a type error. The same happens if you pass an **object** where a **string** is expected.

### 2.2 What is the Logger’s real signature?

The backend’s structured logger is implemented in `utils/logger/loggerCore.ts`. The `error` method is defined as:

```ts
public error(
  message: string,
  error?: Error | Record<string, any>,
  category = 'ERROR',
  requestId?: string,
  userId?: number
): void
```

So the **order of arguments** is:

1. **message** (string)  
2. **error** (optional: an Error or a plain object with details)  
3. **category** (string, e.g. `'LEGAL_JOURNAL'`)  
4. **requestId** (optional string)  
5. **userId** (optional number)

There is **no** “metadata object” as a separate argument. The **second** argument is either the error or a record; the **third** is always the category string.

### 2.3 What we were doing wrong

In Patch 56 we introduced calls like:

- `logger.error('Some message', error, {}, 'LEGAL_JOURNAL')`  
- `logger.error('Some message', error, { orderId: order.id }, 'LEGAL_JOURNAL')`

So we were passing **four** arguments: message, error, **an object** (`{}` or `{ orderId }`), and then the category. The logger, however, expects the **third** argument to be the **category** (a string). So:

- The **third** argument we passed was `{}` or `{ orderId: number }`.  
- The compiler expected the third parameter to be a `string`.  
- Hence: “Argument of type '{}' is not assignable to parameter of type 'string'.”

We were, in effect, “inventing” an extra parameter that the logger does not have.

### 2.4 The fix (aligned with the logger design)

- For calls that had no extra context: we removed the extra object and now call:  
  `logger.error(message, error, category)`  
  e.g. `logger.error('Error verifying journal integrity', error, 'LEGAL_JOURNAL')`.

- For calls where we wanted an **order id** in the log: the logger does not have a separate “metadata” argument in this signature, so we put the context **in the message**:  
  `logger.error(\`Failed to write legal journal entry for order ${order.id}\`, error, 'LEGAL_JOURNAL')`  
  That way we still get the order id in the log line, without changing the logger’s API.

All call sites in the affected route files (`legal/journal.ts`, `orders/orderCRUD.ts`, `orders/orderPayment.ts`, `orders/orderLegal.ts`, `orders/orderAudit.ts`) were updated to use exactly: **(message, error, category)** (and no extra object). No changes were made to the Logger class itself; we only fixed the call sites to match its real signature.

**Beginner takeaway:** The compiler errors were telling us “you’re passing the wrong type in this position.” Reading the Logger’s definition showed the correct order and types. Fixing the calls to match that contract is the right, long-lasting fix.

---

## 3. SubBill payment_method type

### 3.1 What was wrong?

In `orderCRUD.ts`, when creating sub-bills for a split payment, we do something like:

```ts
sub_bills.map(async (sb: { payment_method: string; amount: number }) =>
  SubBillModel.create({ order_id: order.id, payment_method: sb.payment_method, amount: sb.amount, status: 'pending' })
)
```

The **SubBill** interface (used by `SubBillModel.create`) requires `payment_method` to be the **literal union** `'cash' | 'card'` — only those two strings are allowed. We had typed `sb` as `{ payment_method: string; amount: number }`. In TypeScript, a plain `string` is **wider** than `'cash' | 'card'`: any string could be passed (e.g. `"unknown"`), so the type checker correctly refused to assign `sb.payment_method` (a `string`) to a field that expects `'cash' | 'card'`.

### 3.2 What is “narrowing” and why do we do it?

**Narrowing** means going from a broader type to a more specific one in a way the compiler can trust. Here we have a `string` coming from the request body and we need to pass a `'cash' | 'card'` into the model. So we:

- **Check** the value at runtime: if it’s `'card'`, use `'card'`; otherwise treat it as `'cash'`.  
- **Assign** that to a variable explicitly typed as `'cash' | 'card'`.  
- **Use** that variable in `SubBillModel.create`.

That way the database and the rest of the code only ever see `'cash'` or `'card'`, and the type checker is satisfied.

### 3.3 The fix

Before calling `SubBillModel.create`, we narrow the payment method and pass that into the model:

```ts
sub_bills.map(async (sb: { payment_method: string; amount: number }) => {
  const method: 'cash' | 'card' = sb.payment_method === 'card' ? 'card' : 'cash';
  return SubBillModel.create({ order_id: order.id, payment_method: method, amount: sb.amount, status: 'pending' });
})
```

So we still accept a string from the client, but we coerce it to a safe value and give the model only `'cash' | 'card'`. This matches the SubBill interface and keeps the database consistent.

**Beginner takeaway:** When the API expects a union of specific strings (like `'cash' | 'card'`), we must ensure we only pass those values. Narrowing with a simple check (and a sensible default like `'cash'`) is a standard and safe approach.

---

## 4. Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| Logger “{} not assignable to string” | 3rd argument was an object; logger expects 3rd = category (string) | Use 3-arg form: (message, error, category); put order id in message when needed |
| SubBill “string not assignable to 'cash' \| 'card'” | Request body has string; model expects literal union | Narrow to `'cash' \| 'card'` before calling SubBillModel.create |

**Files touched:**  
`routes/legal/journal.ts`, `routes/orders/orderCRUD.ts`, `routes/orders/orderPayment.ts`, `routes/orders/orderLegal.ts`, `routes/orders/orderAudit.ts`.

After these changes, `npm run build` in the backend completes successfully with no type errors. The behaviour of the logger and of sub-bill creation remains correct and aligned with the existing architecture.
