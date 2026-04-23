# 77 — B4: Clarify `orders` receipt columns usage (IMPLEMENTATION)

Date: 2026-04-24  
Status: **Implemented** (query/source-of-truth fix, no schema expansion).  
Plan reference: `docs/patch-notes/76-ORDERS-RECEIPT-COLUMNS-B4-PLAN.md`.

---

## 1) Problem fixed

`printDataRepo.ts` was reading non-authoritative / drifted `orders` columns:

- `orders.receipt_number`
- `orders.receipt_hash`
- `orders.tax_amount`

Current order schema and order flows use:

- `orders.total_tax` (not `tax_amount`)
- legal fiscal chain in `legal_journal` (sequence/hash), not ad-hoc `orders.receipt_*`.

---

## 2) What changed

File updated:

- `MuseBar/backend/src/printing/printDataRepo.ts`

### 2.1 Receipt query source-of-truth alignment

In `buildReceiptDataForOrder(...)`:

- Replaced `o.tax_amount` with `o.total_tax`.
- Replaced `o.receipt_number` with:
  - `COALESCE(lj.sequence_number, o.id)` where `lj` is from `legal_journal`.
- Replaced `o.receipt_hash` with:
  - `lj.current_hash` from `legal_journal`.

Added lateral join:

- `LEFT JOIN LATERAL (...) lj` selecting latest SALE entry for the same `order_id` + `establishment_id`.

This keeps receipt fiscal metadata anchored to the legal journal chain.

### 2.2 Safe fallbacks and parsing guards

- Added numeric safety guards in code:
  - sequence fallback to `order_id` if sequence is missing/invalid
  - tax fallback to `0` if parse fails
- `receipt_hash` remains optional in `compliance_info` when no legal entry exists.

---

## 3) Verification

Executed:

- `npx tsc --noEmit` ✅
- `npx vitest run` ✅ (`6` files, `17` tests)

No migration was required for B4 option A.

---

## 4) Legal/functional note

B4 intentionally **does not** introduce invoice numbering.

- Receipt printing now references legal fiscal data from journal entries.
- A dedicated invoice subsystem (separate legal numbering series and lifecycle) remains a planned future feature after audit fixes.

