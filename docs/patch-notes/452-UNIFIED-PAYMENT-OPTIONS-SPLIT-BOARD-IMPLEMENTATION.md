# 452 - Unified Payment Options: Split Board + Faire de la Monnaie Tab - Implementation

Date: 2026-08-06  
Prior: `451` (Pourboire card + equal/custom tabs)

---

## 1) Context

Cart had four actions cluttering the footer. Payment options were split across Simple /
Partagé / égal / personnalisé / par montant / par articles. Goal: one **Options de
paiement** dialog that covers partage + faire de la monnaie, and free a cart button slot.

---

## 2) Cart buttons

| Before | After |
|---|---|
| Paiement CB · Espèces · Options · Faire de la monnaie | Paiement CB · Espèces · **Options de paiement** |

Faire de la monnaie moves into the options dialog (second tab).

---

## 3) Options dialog tabs

1. **Partage** — single board (replaces equal/custom + amount/items modes)
2. **Faire de la monnaie** — amount field, card→cash same amount (same API as before)

---

## 4) Partage board (v1)

Two columns:

| Left | Right |
|---|---|
| Order lines still unassigned | N payment carts (card/cash each) |
| Checkboxes + check-all | Drop zones for DnD |
| Context menu / long-press | Remove item → back to pool |

Actions:

- Drag item(s) onto a payment cart
- Buttons « → Paiement k » for the selection
- Context menu: send to bill k · split equally across all · split across chosen bills
- **Parts égales (montants)** — money-only equal split (no line assignment; amounts must sum to CA)
- Confirm when bill totals match order CA (tips stay order-level hors CA)

Helpers: `splitAssignment.ts` (cent-safe move / split / equal amounts).

---

## 5) Intentionally deferred

- Drag from bill to bill
- Partial amount edit on a cart while also holding items
- Visual “already split” state on left for fragments
- Further polish of touch DnD on some tablets

---

## 6) Verification

Frontend `tsc --noEmit` ✅. No migration.
