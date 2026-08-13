# 451 - Pourboire Product Card + Payment Tabs (Equal / Custom) - Implementation

Date: 2026-08-06  
Related: tip accounting in `paymentBreakdown.ts` (+card / −cash)

---

## 1) Context

Two POS payment UX changes:

1. **Tips lived only in "Paiement simple"** as a large optional field used solely for card tips.
   That was too much UI for one operation. Tips move to a **Pourboire** product card (same
   pattern as Divers).
2. **Top payment tabs** were "Paiement simple" / "Paiement partagé". Inside partagé sat
   "Partage égal" / "Personnalisé". Those become the **top-level** tabs.

---

## 2) Tip accounting (unchanged semantics)

Card tips must **not** enter chiffre d'affaires:

| Layer | Behavior |
|---|---|
| Cart | Line with `isTip: true` — shown with "Hors CA", no Happy Hour / Offert / Perso |
| Totals | `usePOSOrderTotals` excludes tip lines from `orderTotal` / tax; exposes `tipsTotal` |
| Checkout | Tip lines stripped from `items`; sum sent as `orders.tips` |
| Closures | Existing `paymentBreakdown`: `card += tips`, `cash -= tips` |

So the Pourboire card is UX only — storage and fiscal math stay on `orders.tips`.

---

## 3) Pourboire product card

| Piece | Detail |
|---|---|
| Grid | `PourboireCard` next to Divers (`ProductGrid`) |
| Dialog | `PourboireDialog` — amount only (+ short explanation of +carte/−espèces) |
| Line | `productName: "Pourboire (carte)"`, `isTip: true`, tax 0 |
| Order panel | Footer shows "Pourboire carte (hors CA)" when `tipsTotal > 0` |
| Quick CB / Espèces | Also extract tips via `tipsFromOrder` / `saleLines` |

---

## 4) Payment dialog tabs

| Before | After |
|---|---|
| Tab 0: Paiement simple (method + tip field + confirm) | Tab 0: **Partage égal** |
| Tab 1: Paiement partagé (radio égal/custom inside) | Tab 1: **Partage personnalisé** |

- Equal allows **1–10** payers (`1` = single payment with card/cash on the row — replaces simple).
- Custom still requires **2–10**.
- Auto-init on tab / count change.
- Single-bill checkout stores `payment_method: card|cash` (not `split`) for cleaner closures.
- Tip alert in the dialog when cart has pourboire lines.

Personnalisé internals (amount vs items) unchanged — next pass will rework that UX.

---

## 5) Node version (dev environment)

Backend vitest 4.x needs **Node ≥ 20.12** (`styleText` from `node:util`). This machine had
system Node 18.19. Installed **Node 22 via nvm** (user-space) and set
`engines.node: ">=20.12.0"` on the backend package. New shells: `nvm use` (or open a fresh
terminal — nvm is in `~/.bashrc`).

---

## 6) Verification

| Check | Result |
|---|---|
| Frontend `tsc` | ✅ |
| Frontend vitest | ✅ 24 tests |
| Backend vitest on Node 22 | Runs (pre-existing unrelated failures remain) |

No DB migration.
