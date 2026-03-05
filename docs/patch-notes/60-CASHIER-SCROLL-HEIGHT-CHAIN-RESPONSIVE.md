# Fix: Cashier Scroll and Full-Height Layout (Menu + Commande)

This doc explains **why** the menu scrolled as a whole (search/categories not sticky) and payment options were cut off in Commande, **what** we changed (viewport height chain + flex scroll regions), and **how** to verify.

---

## 1. What was the problem?

### 1.1 Menu: search and categories scrolled away

In the Caisse tab (Menu sub-tab or wide layout), the **entire** menu block (search bar, category chips, product grid) was in one flow with no height limit. The content area grew with content, so the **browser window** scrolled and the search bar and categories scrolled off the top. The goal was to keep search and categories **fixed at the top** and have **only the product list** scroll.

### 1.2 Commande: payment options cut off on small screens

In the Commande panel, the order list had a fixed **maxHeight: 300px** and the card (header + list + totals + payment buttons) had no participation in a flex height chain. On short viewports the full card was taller than the viewport, so the **payment block** (Paiement CB, Paiement espèces, Options de paiement) was below the fold and only reachable by scrolling the **page**. Users could not reliably reach payment on phones, tablets, or short windows.

### 1.3 Root cause

The **main content area had no viewport-based height**. The app used `AppHeader` + `Container` with no height constraint, so content height = content length and the **page** scrolled. Internal “scroll only this region” (product list, order list) never received a bounded height, so it could not work as intended.

---

## 2. What was changed

### 2.1 Viewport height chain (App + AppRouter)

**App.tsx (business view only)**

- Wrapped `AppHeader` + `Container` in a **Box** with `display: 'flex'`, `flexDirection: 'column'`, `height: '100vh'`.
- Gave the **Container** `flex: 1`, `minHeight: 0`, `display: 'flex'`, `flexDirection: 'column'` so it takes the remaining space below the header and passes it to the single child (AppRouter).

**AppRouter.tsx**

- **Paper:** added `flex: 1`, `minHeight: 0`, `display: 'flex'`, `flexDirection: 'column'`, `overflow: 'hidden'` so it fills the Container and does not overflow the viewport.
- **TabPanel:** the content **Box** (when the tab is active) now has `flex: 1`, `minHeight: 0`, `overflow: 'hidden'`, `display: 'flex'`, `flexDirection: 'column'`, and keeps `p: 3`. The tab panel wrapper div uses `flex: 1` when active so it takes the remaining space below the Tabs.

Result: **100vh → header (fixed) → Container (flex: 1) → Paper (flex: 1) → Tabs (fixed) → TabPanel Box (flex: 1) → tab content (e.g. POSContainer)**. Tab content now has a bounded height and can use internal scroll (product list, order list).

### 2.2 Menu: search + categories fixed, only product list scrolls

**POSContainer.tsx**

- The **Box** that wraps ProductGrid in `menuContent` was updated from `flexGrow: 1, overflow: 'auto'` to **`flex: 1`, `minHeight: 0`, `overflow: 'auto'`**.

With the new height chain, the parent of `menuContent` (in POSLayout) has a real height. In a flex column, the scrollable child needs `minHeight: 0` to be allowed to shrink and show a scrollbar. So only the **product list** scrolls; CategoryFilter (search + category chips) stays at the top. Same behaviour in both narrow (tabbed) and wide (side-by-side) layouts.

### 2.3 Commande: list scrolls, header and payment block always visible

**OrderSummary.tsx**

- **Card:** added `minHeight: 0` so the card can shrink when the Commande panel has limited height (e.g. tabbed view).
- **CardContent:** set `flex: 1`, `minHeight: 0`, `overflow: 'hidden'` so the content area participates in the flex chain.
- **Header** (title + clear button): wrapped in a Box with `flexShrink: 0` so it never shrinks.
- **When there are items:** the **List** is wrapped in a **Box** with `flex: 1`, `minHeight: 0`, `overflow: 'auto'`. Removed **maxHeight: '300px'** from the List so height comes from the flex layout. The **Divider + totals + payment buttons** block is wrapped in a Box with `flexShrink: 0`.

Result: header and payment block stay visible; only the order list scrolls when there are many items. Payment options remain visible at the bottom of the panel on any viewport (phone, tablet, desktop).

---

## 3. How to verify

1. **Height chain:** Resize the window; the main content (tabs + tab content) should not cause **page** scroll. Only inner areas (product list, order list) should scroll when needed.
2. **Menu (Caisse):** Wide and narrow (tabbed): search bar and category chips stay at the top; scrolling moves only the product grid.
3. **Commande:** With many items, the order list scrolls; “Commande (…)” and the payment buttons (Paiement CB, Paiement espèces, Options de paiement) stay visible. On a short viewport, the payment block remains visible without scrolling the page.
4. **Other tabs:** Menu management, Historique, etc. still render; if their content is tall, it scrolls inside the same constrained panel.

---

## 4. Summary

| Before | After |
|--------|--------|
| Page scrolled; search/categories scrolled away | Content area has max height (100vh − header); only product list scrolls |
| Commande payment buttons cut off on small screens | Order list scrolls; header and payment block always visible |
| No viewport-based height chain | App → Container → Paper → TabPanel pass height via flex |

Layout uses the standard flex pattern: parent with bounded height → flex column → fixed header/footer (flex-shrink: 0) and scrollable middle (flex: 1, minHeight: 0, overflow: auto). Works on phone, tablet, touch cashier, and desktop.
