# Fix: Currency Formatting Deduplication (Audit #27)

This doc explains **why** duplicating the same currency formatter in many files was a problem, **what** we changed, and **how** to keep formatting consistent with a single source of truth.

---

## 1. What was the problem?

The same Euro (EUR) formatting logic was copy-pasted in **11 places** across the frontend:

```ts
new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
```

(or a local helper that did exactly this). It appeared in:

- **Legal / compliance:** `useCompliance.ts`, `ComplianceReports.tsx`, `LegalReceipt/utils.ts`
- **Closure:** `ClosureContainer.tsx`
- **POS / payment:** `PaymentConfirmation.tsx`, `SplitPayment.tsx`, `PaymentCalculator.tsx`, `usePaymentState.ts`
- **Menu:** `MenuContainer.tsx`
- **History / POS logic:** `useHistoryLogic.ts`, `usePOSLogic.ts`

**Why that’s a problem:**

- **Maintainability:** Any change (e.g. decimals, spacing, or later a second currency) would require finding and updating every copy. Easy to miss one and get inconsistent display.
- **Consistency:** If one place is updated and another isn’t, users see different formats in different parts of the app.
- **No single source of truth:** There is no single place that defines “how we show money in this app.”

The app is France-only and Euro-only for now, so the *behavior* (fr-FR, EUR) was correct; the issue was **duplication**, not the choice of locale or currency.

---

## 2. What we changed

### 2.1 Single shared utility

- **Added** `src/utils/formatCurrency.ts`:
  - Creates one `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` instance.
  - Exports a single function: **`formatCurrency(amount: number): string`**.

All currency display in the app now goes through this function.

### 2.2 Replacing every duplicate

- **LegalReceipt/utils.ts:** Removed the local `formatCurrency` implementation; it now imports from `utils/formatCurrency` and re-exports it so existing imports from `LegalReceipt/utils` still work.
- **useCompliance.ts:** Removed the local `formatCurrency` (and its `useCallback`); the hook now imports and returns the shared `formatCurrency`.
- **ClosureContainer.tsx, ComplianceReports.tsx, PaymentConfirmation.tsx, SplitPayment.tsx, PaymentCalculator.tsx, MenuContainer.tsx:** Removed the local `formatCurrency` function; each file now imports `formatCurrency` from `utils/formatCurrency`.
- **usePaymentState.ts, useHistoryLogic.ts, usePOSLogic.ts:** Removed the local `formatCurrency`; each hook imports and (where applicable) returns the shared `formatCurrency`.

No change to **behavior**: the user still sees Euro in French locale everywhere. Only the **implementation** is centralized.

---

## 3. How to verify

1. **Build:** From `MuseBar`, run `npm run build`. It should succeed.
2. **Search:** `grep -r "Intl.NumberFormat.*fr-FR" MuseBar/src` should show only `src/utils/formatCurrency.ts`.
3. **UI:** Check a few screens that show money (POS total, payment dialog, closure totals, compliance reports, menu prices). Amounts should still look the same (e.g. `12,50 €`).

---

## 4. Takeaway

- **One formatter, one place:** For locale-sensitive formatting (currency, dates, numbers), define a single helper and use it everywhere. That way one change (e.g. decimals, or adding a currency) is done once and stays consistent.
- **Shared utils:** `src/utils/formatCurrency.ts` is the single source of truth for “how we display Euro in this app.” New features that show money should import it instead of creating their own formatter.
