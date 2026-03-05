# Fix: Cashier Wide Layout — Box Flex and Overflow Chain (Follow-up to 60)

This doc describes the **follow-up** to patch 60 that made scroll and payment buttons work on **large (wide) screens**. Patch 60 established the viewport height chain and scroll regions; on narrow screens (tabbed view) everything worked, but on wide screens the product list, order list, and payment buttons still did not scroll or show correctly. This patch completes the fix.

---

## 1. What was still wrong after 60?

On **wide** (desktop) layout, the Caisse tab showed menu and order side-by-side using **MUI Grid**. Despite applying `flex: 1`, `minHeight: 0`, and `overflow: hidden` to the Grid and its items, the height did not propagate reliably: the product list and order list had no scrollbars, and the three payment buttons (Paiement CB, Paiement espèces, Options de paiement) remained off-screen. The **narrow** (tabbed) layout worked because it used a simple Box-based flex chain without Grid.

---

## 2. Root cause (wide layout)

MUI **Grid** uses flexbox with its own rules (e.g. `flex-wrap`, item basis). In this app the Grid container and items did not reliably participate in the flex height chain, so the columns never received a bounded height and inner scroll areas (product list, order list) could not work. The order card grew with content and the payment block stayed below the fold.

---

## 3. What was changed (follow-up)

### 3.1 POSLayout.tsx — wide layout: Grid replaced by Box flex

- **Removed:** MUI `Grid` and `Grid item` for the wide (two-column) layout.
- **Added:** A single **Box** row with `display: 'flex'`, `flex: 1`, `minHeight: 0`, `overflow: 'hidden'`, and two child **Box**es:
  - **Menu column:** `flex: '1 1 0'`, `minWidth: 0`, `minHeight: 0`, `overflow: 'hidden'`, flex column. Passes through `menuContent` (search + categories fixed, product list scrolls).
  - **Order column:** `flex: '0 0 33.333%'`, `minWidth: 0`, `minHeight: 0`, `overflow: 'hidden'`, flex column. Passes through `orderContent` (OrderSummary with scrollable list and fixed payment block).
- **Why:** Pure Box/flex gives a predictable height and overflow chain; no Grid-specific behavior. Same pattern as the narrow tabbed layout (flex column with minHeight: 0 and overflow: hidden at each level).
- **Comment:** File header updated to describe "two-column flex layout" instead of "Grid".

### 3.2 POSContainer.tsx — height chain and menu structure

- Root **Box:** added `overflow: 'hidden'` so content cannot break the flex chain.
- **Wrapper Box** (around POSLayout): added `width: '100%'` so the flex row has a defined width; kept `flex: 1`, `minHeight: 0`, `overflow: 'hidden'`.
- **menuContent:** wrapped **CategoryFilter** in a **Box** with `flexShrink: 0` so the search and category chips do not shrink and the product list area gets the remaining space (flex: 1, minHeight: 0, overflow: auto).

### 3.3 App.tsx — Container overflow

- **Container** (business layout): added `overflow: 'hidden'` so the main content area cannot grow and break the viewport-height chain.

### 3.4 OrderSummary.tsx — Card overflow

- **Card:** added `overflow: 'hidden'` so the card stays within its column and does not spill; keeps the internal flex chain (header, scroll list, footer) valid.

---

## 4. Alignment with structure and practices

- **Separation of concerns:** Layout (POSLayout) remains presentational only; state and composition stay in POSContainer. OrderSummary remains a self-contained card with header/scroll/footer.
- **Single source of truth:** One breakpoint (`down('md')`) for narrow vs wide; one flex pattern (flex column/row, minHeight: 0, overflow: hidden/auto) for scroll and fixed regions.
- **No redundant code:** Grid was removed, not duplicated; no leftover Grid imports or unused styles. Wide and narrow both use the same `menuContent` / `orderContent` built once in POSContainer.
- **Long-lasting:** The fix relies on standard flex and overflow behavior, with no Grid-specific workarounds. Future layout changes (e.g. column ratios) are done in one place (POSLayout).

---

## 5. How to verify

- **Wide screen:** Open Caisse; product list (left) and order list (right) show scrollbars when content overflows; search and categories stay at top of the left column; the three payment buttons are always visible at the bottom of the right column.
- **Narrow screen:** Unchanged; Menu | Commande tabs work with scroll and payment visible (from patch 60).
- **No page scroll:** The main content area does not scroll; only the two inner lists scroll.

---

## 6. Summary

| Before (after 60) | After (this patch) |
|-------------------|---------------------|
| Wide: MUI Grid; no scroll, no payment buttons | Wide: Box flex; both lists scroll, payment buttons visible |
| Grid height/overflow unreliable | Box flex chain predictable |
| Container/Card could overflow | overflow: hidden on Container, Card, POSContainer |

Patch 60 established the viewport height chain and scroll regions (App, AppRouter, POSContainer menu structure, OrderSummary flex). This patch (61) completes the cashier layout by making the **wide** layout use the same flex/overflow pattern (Box-based, no Grid) so scroll and payment visibility work on all screen sizes.
