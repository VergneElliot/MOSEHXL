# Session Summary: POS Tax (TTC), Payment Methods, and Code Cleanup

**Purpose:** Handoff for the next AI agent or developer. Summarizes what was done in this conversation: French TTC tax fix, exact tax storage for accounting, payment methods (cash/card only), three payment buttons, migrations, and cleanup of duplicate/redundant code.

**Branch:** `development`  
**Relevant commits:** POS TTC + payment + migrations; then cleanup (single createOrder path, usePOSState slim-down, sub_bills type fix).

---

## 1. What Was Done (This Conversation)

### 1.1 Tax: TTC (All Tax Included) and Display Fix

- **Problem:** In France, displayed prices are TTC (toutes taxes comprises). The order total was computed as `orderSubtotal + orderTax`, so tax was added on top of amounts that were already TTC — the total was wrong (e.g. 8€ item showed more than 8€).
- **Fix:**
  - **usePOSLogic.ts:** `orderTotal = orderSubtotal` (no longer add `orderTax`). Comment: prices are TTC; `orderTax` is for breakdown/legal only.
  - **OrderSummaryCard.tsx:** "Sous-total (HT)" now shows `orderSubtotal - orderTax` (HT) instead of raw `orderSubtotal`.
- **Docs:** `07-LEGAL-COMPLIANCE.md` — added "Pricing and TVA (TTC)" and "Tax and rounding (accounting vs display)".

### 1.2 Tax: Exact Storage for Accounting (No Rounding Before DB)

- **Problem:** Rounding tax before storing (e.g. 2 decimals per line) causes drift when summing for week/month/year closures. For legal compliance, stored values must be exact; rounding only for display.
- **Fixes:**
  - **Migration:** `2026_02_26_01_00_00_accounting_decimal_precision.sql` — `DECIMAL(12,4)` for `orders.total_amount`, `orders.total_tax`, `order_items.unit_price`, `order_items.total_price`, `order_items.tax_amount`, `sub_bills.amount`, `legal_journal.amount`/`vat_amount`, `closure_bulletins.total_amount`/`total_vat`.
  - **Closure operations:** `closureOperations.ts` — VAT breakdown now from `order_items` via `getExactVatBreakdownFromOrderItems(pool, orderIds)`; no rounding before storing; totals and VAT breakdown are exact sums. Rounding only in display/print.
  - **Frontend:** No rounding of `taxAmount` before sending (ProductGrid, POSContainer); comment in ProductGrid that tax is exact for storage.
- **Docs:** Same section in `07-LEGAL-COMPLIANCE.md` on "Tax and rounding".

### 1.3 Migration: user_summary View and Timestamptz

- **Problem:** Timestamptz migration failed: "cannot alter type of a column used by a view or rule" — view `user_summary` depends on `users.created_at`/`updated_at`.
- **Fix:** In `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql`: at start of UP, `DROP VIEW IF EXISTS user_summary`; after all `ALTER TABLE` (including `users`), recreate `CREATE OR REPLACE VIEW user_summary AS ...` (same definition as in `multi-tenant-schema.sql`).

### 1.4 Payment Methods: Cash and Card Only

- **Requirement:** Only two payment methods: cash and card. No check, PayPal, etc. Sub_bills for multipayment (split) still use cash/card per line.
- **Fixes:**
  - **paymentMethodDefaults.ts:** Removed "Chèque" (check); only Espèces (cash) and Carte Bancaire (card) created for new establishments.
  - Validation and types already allowed only `cash` | `card` | `split` (split = order paid with both; sub_bills store `cash` | `card` per line).

### 1.5 POS: Three Payment Buttons

- **Requirement:** Replace single "Encaisser" button with three: quick card, quick cash, and "options" (split, tip, change).
- **Fixes:**
  - **OrderSummary.tsx:** Three buttons: "Paiement CB" (card), "Paiement espèces" (cash), "Options de paiement" (opens payment dialog). Props: `onQuickCard`, `onQuickCash`, `onCheckout`.
  - **POSContainer.tsx:** `usePOSAPI` for createOrder; `handleQuickPayment(method: 'cash' | 'card')` calls `createOrder` with that method and clears cart on success; "Options de paiement" opens PaymentDialog (`setPaymentDialogOpen(true)`).
  - Quick payment: full order by that method, no tips/change (for change/tip/split user uses Options).

### 1.6 Code Cleanup: Single createOrder Path and usePOSState

- **Problem:** Two places built the create-order request (usePOSAPI with `apiService.post` and ordersApi.createOrder with full item mapping including `happy_hour_discount_amount`, `description`). usePOSState held unused state (itemQuantities) and payment-form state duplicated by PaymentDialog (checkoutMode, splitCount, subBills, cashAmount, cardAmount, tips).
- **Fixes:**
  - **usePOSAPI.ts:** `createOrder` now calls `apiService.createOrder({ ... })` with a mapped payload (totalAmount, taxAmount, items, sub_bills, tips, change, notes). Single code path: request body built in `services/api/orders.ts` only.
  - **usePOSState.ts:** Removed `itemQuantities`, `checkoutMode`, `splitCount`, `subBills`, `currentPaymentMethod`, `cashAmount`, `cardAmount`, `tips` and their setters. `clearOrder()` only clears `currentOrder`. Comment: payment form state lives in PaymentDialog/usePaymentState.
  - **usePOSState.test.ts:** Removed tests for removed state; 21 tests pass.
- **Type fix:** `sub_bills` mapping: `bill.payments[0]?.method` is typed `PaymentMethod` ('cash'|'card'|'split'); API expects `payment_method: 'cash'|'card'`. In usePOSAPI, map with `method === 'split' ? 'cash' : method` so type narrows to `'cash'|'card'` (TS2322 resolved).

### 1.7 Other (From Earlier in Conversation)

- **Check-muse script:** Removed `check-muse-access.ts` and npm scripts; doc `10-MULTI-TENANT-AND-MUSE-POS-ACCESS.md` describes fixing Muse POS access with SQL only (get Muse UUID, update users with establishment_id/role).

---

## 2. Key Files Touched

| Area | Files |
|------|------|
| **Tax / TTC** | `MuseBar/src/hooks/usePOSLogic.ts`, `MuseBar/src/components/POS/OrderSummaryCard.tsx`, `docs/07-LEGAL-COMPLIANCE.md` |
| **Tax / exact storage** | `MuseBar/backend/src/migrations/files/2026_02_26_01_00_00_accounting_decimal_precision.sql`, `MuseBar/backend/src/models/legalJournal/closureOperations.ts`, `MuseBar/src/components/POS/ProductGrid.tsx` |
| **Migrations** | `2026_02_25_01_00_00_convert_timestamps_to_timestamptz.sql` (user_summary drop/recreate), new accounting decimal precision migration |
| **Payment methods** | `MuseBar/backend/src/services/setup/defaults/paymentMethodDefaults.ts` |
| **Three buttons** | `MuseBar/src/components/POS/OrderSummary.tsx`, `MuseBar/src/components/POS/POSContainer.tsx` |
| **Cleanup** | `MuseBar/src/hooks/usePOSAPI.ts`, `MuseBar/src/hooks/usePOSState.ts`, `MuseBar/src/hooks/__tests__/usePOSState.test.ts` |

---

## 3. Design Decisions (For Next Agent)

- **Closure totals:** Always sum from `orders` and `order_items` (exact stored values). We do **not** roll up from daily closures for weekly/monthly/yearly, so we don't depend on every day being closed; single source of truth = orders.
- **Payment form state:** PaymentDialog owns split/tips/cash received via `usePaymentState` (inside PaymentDialog/hooks). usePOSState only holds `paymentDialogOpen` (visibility).
- **createOrder:** Single implementation in `services/api/orders.ts`; usePOSAPI and PaymentDialog both call `apiService.createOrder` (which delegates to ordersApi.createOrder). Item mapping (happy_hour_discount_amount, description) lives only there.
- **Tax display vs storage:** Display uses `formatCurrency` / `.toFixed(2)`. Stored values are exact (DECIMAL 12,4); round only when rendering.

---

## 4. What to Run / Verify

- **Migrations:** `cd MuseBar/backend && npm run migration:migrate` (timestamptz with user_summary fix, then accounting decimal precision).
- **Frontend tests:** `npm test -- --testPathPattern="usePOSState"` (21 tests).
- **Manual:** Add product to cart → "Paiement CB" or "Paiement espèces" (quick payment); "Options de paiement" opens dialog (split, tip, change). Order summary shows Total TTC = sum of line totals (no tax added on top).

---

## 5. Possible Next Steps

- Deeper payment flows: split bills persistence, tip handling, "make change" operation.
- Products/categories: ensure linked to establishment_id; verify category and product CRUD.
- Optional: centralize `formatCurrency` in a shared util (currently in usePOSLogic, usePaymentState, LegalReceipt/utils, and some components).
- Legal journal/closure: confirm establishment_id scoping if/when legal tables get it.
