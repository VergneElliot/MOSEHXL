# 453 - POS Cart Actions Panel: Selection, DnD, Two-Column Layout - Implementation

Date: 2026-08-06  
Prior: `452` (unified payment options / split board)

---

## 1) Context

Prepare the main POS screen for a denser cart workflow and future open-table / floor-plan
features. Line actions and payment buttons were crowded on each cart row / footer; product
add was click-only.

---

## 2) Cart layout

Two columns inside `OrderSummary`:

| Left | Right |
|---|---|
| Selectable lines + « Tout sélectionner » | Happy Hour / Offert / Perso / Notes |
| Totals (HT, TVA, tips, Total TTC) | Paiement CB / Espèces / Options de paiement |
| Drop zone for products | Stubs: Sélectionner une table, À suivre (`Bientôt`) |

On narrow viewports the actions stack under the lines (still one action group, not per-line chips).

Order panel width on desktop raised to ~**40%** (`POSLayout`) so both columns fit.

---

## 3) Selection semantics

- Checkboxes on lines (by stable `OrderItem.id`).
- **No selection** → discount / note actions apply to **all non-tip** lines.
- **Selection** → apply only to selected non-tip lines.
- Notes: one dialog → same note written to every resolved target (lines with `productId`).

---

## 4) Product → cart drag-and-drop

- Product cards are `draggable` (`POS_PRODUCT_DND_MIME` in `posProductDnD.ts`).
- Drop on the cart resolves the product and calls existing `handleRequestAddProduct`
  (option dialog preserved). Click « Ajouter » unchanged.
- Divers / Pourboire stay click → dialog only.

---

## 5) Files

- `OrderSummary.tsx` / `OrderSummaryItem.tsx` — layout + selection
- `POSOrderPanel.tsx` / `POSContainer.tsx` — `onDropProduct`
- `ProductGrid.tsx` — card drag payload
- `POSLayout.tsx` — order column ~40%
- `posProductDnD.ts` — shared MIME + payload type

---

## 7) Follow-ups (same day)

- Cart line click toggles selection (not only the checkbox); clear-cart X sits on the **Commande** column header.
- Divers / Pourboire cards are draggable; drop opens the same dialogs as click.
- Order create: if a line has an ad-hoc **Note** and no kitchen-printer assignment, it is routed to the establishment **default** kitchen printer (first active by `display_order`).
