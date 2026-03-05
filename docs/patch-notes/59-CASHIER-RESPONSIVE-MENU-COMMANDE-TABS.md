# Fix: Cashier Responsive Layout — Menu | Commande Tabs on Small Screens

This doc explains **why** the cashier (Caisse) needed a responsive layout change, **what** we changed (POSLayout component + POSContainer refactor), and **how** to verify.

---

## 1. What was the problem?

In V2, the cashier tab used a single **Grid** layout:

- **Wide (≥ md):** Menu (category filter + product grid) in 8 columns, order summary (Commande) in 4 columns — side-by-side.
- **Narrow (< md):** Both sections got full width and **stacked vertically**: menu on top, order cart at the bottom.

On small screens (tablets, narrow windows), having the order cart at the bottom was poor UX: the user had to scroll past the full menu to reach the cart. The old V1 interface instead used **tabs** on small screens: "Menu" and "Commande" so the user could switch between viewing the product list and viewing the order cart, with only one panel visible at a time. We wanted the same behaviour in V2 without changing the rest of the UI.

---

## 2. Design principles

- **Separation of concerns:** Layout (when to show tabs vs grid) lives in a dedicated component; POSContainer keeps only POS state, logic, and composition.
- **Modular architecture:** New component has a single responsibility (responsive layout); same CategoryFilter, ProductGrid, OrderSummary — only the container changes by breakpoint.
- **Single source of truth:** Menu and order content are built once in POSContainer and passed into the layout; one breakpoint drives the behaviour.
- **No redundant code:** No duplicate "mobile" versions of components; same components, different wrapper.

---

## 3. What was changed

### 3.1 New component: POSLayout

- **File:** `MuseBar/src/components/POS/POSLayout.tsx`
- **Role:** Responsive layout only. Accepts `menuContent`, `orderContent`, and optional `orderBadge`.
- **Breakpoint:** `useMediaQuery(theme.breakpoints.down('md'))` — aligned with the rest of the app (MenuContainer, OrderSummary, CategoryFilter, etc.).
- **Wide (≥ md):** Renders a Grid with two columns (menu 8 cols, order 4 cols), same as before.
- **Narrow (< md):** Renders a tab bar with two tabs:
  - **Menu** (RestaurantMenu icon) — shows menu content.
  - **Commande** (ShoppingCart icon) — shows order content; label includes item count when > 0, e.g. "Commande (3)".
- **State:** Local `useState` for active tab index (0 = Menu, 1 = Commande); default 0. No POS state or API calls.
- **Accessibility:** MUI Tabs with proper `id` / `aria-controls` / `role="tabpanel"` for the panels.

### 3.2 POSContainer refactor

- **File:** `MuseBar/src/components/POS/POSContainer.tsx`
- **Unchanged:** All hooks (usePOSState, usePOSLogic, usePOSAPI), event handlers, Snackbar, PaymentDialog. No change to state or data flow.
- **Changed:**
  - Build **menuContent**: a fragment containing CategoryFilter and the scrollable Box with ProductGrid (same structure as before).
  - Build **orderContent**: the existing OrderSummary with the same props.
  - Replace the previous `<Grid container>…</Grid>` with `<POSLayout menuContent={…} orderContent={…} orderBadge={state.currentOrder.length} />`.
- **Removed:** Direct use of Grid in POSContainer (Grid is now only inside POSLayout).

Result: one place defines "what is the menu" and "what is the order"; one place (POSLayout) defines "side-by-side vs tabbed" from a single breakpoint.

---

## 4. How to verify

1. **Wide screen (e.g. desktop, window ≥ md):** Open the Caisse tab. Menu and Commande should appear side-by-side (menu left, order right), as before.
2. **Narrow screen (e.g. resize below md, or device toolbar in Chrome):** The cashier should show two tabs at the top: "Menu" and "Commande". Only one panel is visible at a time; switching tabs shows the other. Commande tab label shows the item count when the order has items (e.g. "Commande (2)").
3. **No duplication:** CategoryFilter, ProductGrid, and OrderSummary are the same components; no new "mobile" variants. Add to order, update quantity, checkout, and payment dialogs behave the same in both layouts.
4. **State preserved:** When switching between Menu and Commande tabs, order state is unchanged (state lives in POSContainer; both panels receive the same props).

---

## 5. Summary

| Before | After |
|--------|--------|
| Narrow: menu on top, order cart at bottom (stacked) | Narrow: tabbed view (Menu \| Commande), one panel at a time |
| Wide: side-by-side Grid (unchanged) | Wide: same side-by-side Grid |
| Layout and content mixed in POSContainer | Layout in POSLayout; content composed once in POSContainer |

Cashier responsiveness now matches the V1 pattern on small screens (tabs instead of stacked cart at bottom), with a clear separation between layout and POS logic.
