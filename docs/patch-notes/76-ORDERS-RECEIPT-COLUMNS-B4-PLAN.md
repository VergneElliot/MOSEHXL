# 76 — B4: Clarify `orders` receipt columns usage (PLAN)

Date: 2026-04-24  
Branch: `development`  
Status: Plan only.

Audit B4 asks to resolve drift between code and schema around:

- `orders.receipt_number`
- `orders.receipt_hash`
- `orders.tax_amount`

Current schema uses `orders.total_tax`, and receipt/hash values are fiscally anchored in `legal_journal`.

---

## 0) Chosen direction (Option A)

We will **remove reliance** on non-schema `orders.*` receipt columns in `printDataRepo.ts` and compute/fetch values from authoritative sources:

- Tax: `orders.total_tax`
- Fiscal sequence/hash: from `legal_journal` for the order (`establishment_id` scoped)

No `orders` schema expansion in B4.

---

## 1) Why this is safer

- Avoids reintroducing schema drift with ad-hoc columns not in migration chain.
- Keeps fiscal references anchored to legal journal chain (single source of truth).
- Distinguishes internal order ID from fiscal sequence/hash.

---

## 2) Planned code changes

### 2.1 Receipt query in `printDataRepo.ts`

- Replace:
  - `o.receipt_number AS sequence_number`
  - `o.tax_amount AS total_tax`
  - `o.receipt_hash`
- With:
  - `o.total_tax AS total_tax`
  - lateral/left join to `legal_journal` for the order scoped by establishment:
    - `sequence_number`
    - `current_hash` (mapped to `compliance_info.receipt_hash`)

### 2.2 Fallback behavior

- If no legal journal row exists (unexpected edge case), keep printing functional:
  - `sequence_number` falls back to `order_id`
  - `receipt_hash` omitted
- This keeps operations resilient while avoiding fake schema columns.

### 2.3 Documentation

- Add B4 implementation patch note after shipping.
- Keep a documented follow-up for a dedicated **invoice subsystem** (separate legal numbering series), outside B4.

---

## 3) Verification

- `npx tsc --noEmit`
- `npx vitest run`
- Manual smoke:
  - print receipt for a completed order with legal journal entry
  - verify receipt still contains fiscal hash when available.

---

## 4) Completion artifact

- `docs/patch-notes/77-ORDERS-RECEIPT-COLUMNS-B4-IMPLEMENTATION.md`

