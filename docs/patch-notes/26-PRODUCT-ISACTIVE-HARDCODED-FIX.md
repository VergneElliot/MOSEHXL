# Fix: Product isActive Hardcoded to true (Audit #18)

This doc explains **why** the products API layer was forcing `isActive: true` instead of using the value from the database, **what** that broke (deactivated products still appeared active in the frontend), and **how** we fixed it so the UI reflects the real `is_active` state and updates can persist it.

---

## 1. What was the problem?

In **MuseBar/src/services/api/products.ts** (the frontend API client that maps backend responses to the `Product` type), two places **hardcoded** `isActive: true`:

| Location | Function | Issue |
|----------|----------|--------|
| Line ~16 | **getProducts()** | When mapping the API response to `Product[]`, the code set `isActive: true` for every product instead of using the backend field `prod.is_active`. So even if the backend returned only active products (which it does for GET /products), any future use of the same mapper or any endpoint that returns `is_active: false` would be overwritten. More importantly, **getAllProductsIncludingArchived()** already used `prod.is_active !== false`; **getProducts()** and **updateProduct()** did not, so behaviour was inconsistent and the “single list” view could never show inactive correctly if it used getProducts. |
| Line ~113 | **updateProduct()** | After a PUT, the returned `Product` was built with `isActive: true` instead of `result.is_active`. So after deactivating a product (e.g. via a toggle or DELETE soft-delete), the frontend state could show the product as still active. |

In addition, **updateProduct()** never sent `isActive` to the backend: the request body did not include `is_active`, so toggling “active” in the UI could not be persisted via PUT. The backend route did not accept `is_active` in the PUT body either.

**Result:** Deactivated (archived) products still appeared as active in the frontend, and any flow that relied on the returned product after update (e.g. toggling active/archived) showed the wrong state.

---

## 2. Why this matters

- **Correctness:** The UI must show the real state from the database. If the API layer overwrites `is_active` with `true`, lists and product cards will show archived products as active and the “archived” list may be inconsistent with what the user expects.
- **Single source of truth:** The backend (and DB) own `is_active`. The frontend should map the API response 1:1 for that field, not inject a constant. Same for the object returned after update: it should reflect the server response.
- **Persistence:** If the UI allows “deactivate product” via an update (e.g. `updateProduct(id, { isActive: false })`), that change must be sent to the backend and the returned product must show `isActive: false`.

So the fix is: **use the API’s `is_active` everywhere** in the products client, and **send and accept `is_active` on PUT** so updates can change and return the real state.

---

## 3. What we changed

### 3.1 Frontend (MuseBar/src/services/api/products.ts)

- **getProducts()**  
  Replaced `isActive: true` with **`isActive: prod.is_active !== false`** so the mapped list reflects the backend. (GET /products only returns active products today, so `is_active` is always true there; this keeps the mapper correct and consistent with **getAllProductsIncludingArchived()**.)

- **createProduct()**  
  Replaced `isActive: true` in the returned product with **`isActive: result.is_active !== false`** so the created product reflects the backend response (new products are created active).

- **updateProduct()**  
  - **Request:** If the caller passes `product.isActive`, send it as **`is_active`** in the PUT body: `if (product.isActive !== undefined) updateData.is_active = product.isActive`.
  - **Response:** Build the returned `Product` from the API result and use **`isActive: result.is_active !== false`** instead of `isActive: true`. Also use `result` for other fields (e.g. description, happy-hour fields) where appropriate so the returned object matches server state.

### 3.2 Backend (MuseBar/backend/src/routes/products.ts)

- **PUT /products/:id**  
  Accept **`is_active`** in the request body and pass it through to the model:  
  `if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === true;`  
  The product model already allowed `is_active` in its update whitelist; only the route was missing the mapping. Now a frontend call like `updateProduct(id, { isActive: false })` is persisted and the response carries the updated state.

---

## 4. How to verify

1. **List behaviour**  
   Use “active” and “archived” (or “all”) product lists. Products that are deactivated (e.g. via soft delete or update) should appear only in the archived/all list with “inactive” state, not as active in the main list.

2. **Update and return value**  
   Call `updateProduct(id, { isActive: false })` (or use the UI that does this). The returned product should have `isActive: false`, and the next fetch (e.g. getProducts or getAllProductsIncludingArchived) should show the product as inactive where expected.

3. **Backend**  
   After PUT with `is_active: false`, the DB row for that product should have `is_active = FALSE`; GET /products should not return it; GET /products/archived or GET /products/all should return it with `is_active: false`.

---

## 5. Takeaway

- **Don’t hardcode server-derived state:** When mapping API responses to the frontend model, use the backend fields (e.g. `prod.is_active`, `result.is_active`) instead of constants. Otherwise the UI can show a different state than the database.
- **Return value after update:** The object returned from `updateProduct()` (and similar) should be built from the **API response**, not from the request or a default. That way the client state stays in sync with the server after each update.
- **Support the full contract:** If the UI can update a field (e.g. “active” toggle), the API client must send that field in the request and the backend must accept and persist it; then the response should reflect the new value so the frontend doesn’t overwrite it with a hardcoded default.
