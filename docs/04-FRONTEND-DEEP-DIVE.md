# Chapter 4 — Frontend Deep Dive

This chapter explains React, components, hooks, state management, and Material-UI — everything the user interface is built with.

---

## What Is React?

React is a JavaScript library for building user interfaces. It was created by Facebook. The core idea is: **your UI is a function of your data**. You describe what the screen should look like for a given piece of data, and React handles updating the browser when the data changes.

Without React, you'd manually manipulate the HTML (DOM) with JavaScript — adding elements, removing elements, changing text. That gets messy fast. React lets you write declarative components instead.

---

## Components — The Building Blocks

A **component** is a reusable piece of UI. In React, everything is a component:

```tsx
// A simple component — it's just a function that returns JSX
const ProductCard: React.FC<{ name: string; price: number }> = ({ name, price }) => {
  return (
    <div>
      <h3>{name}</h3>
      <p>{price.toFixed(2)} €</p>
    </div>
  );
};

// Using it:
<ProductCard name="Heineken 33cl" price={6.50} />
```

### JSX — HTML inside JavaScript

That HTML-looking syntax inside the function is **JSX**. It's not actual HTML — it's a TypeScript extension that compiles to JavaScript function calls. Curly braces `{}` let you embed JavaScript expressions inside it:

```tsx
<p>Total: {orderTotal.toFixed(2)} €</p>
// Renders: "Total: 15.00 €"

{isHappyHourActive && <Chip label="HAPPY HOUR ACTIF" color="success" />}
// Only renders the Chip if isHappyHourActive is true
```

### .tsx vs .ts

- `.ts` files contain pure TypeScript (no JSX) — types, hooks, services
- `.tsx` files contain TypeScript with JSX — components that render UI

---

## Props — Data Flowing Down

**Props** (properties) are how you pass data from a parent component to a child component:

```tsx
// Parent passes data through props
<POSContainer
  categories={categories}     // ← prop
  products={products}         // ← prop
  isHappyHourActive={true}    // ← prop
  onDataUpdate={updateData}   // ← prop (a function)
/>

// Child receives props
const POSContainer: React.FC<POSContainerProps> = ({
  categories,       // ← received from parent
  products,         // ← received from parent
  isHappyHourActive,
  onDataUpdate,
}) => {
  // Use them here
};
```

The TypeScript interface defines what props a component expects:

```tsx
interface POSContainerProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
}
```

If you forget a required prop or pass the wrong type, TypeScript catches it immediately.

Props flow **one way** — parent to child. A child cannot modify its parent's data. If a child needs to communicate up, the parent passes a function as a prop (like `onDataUpdate`).

---

## State — Data That Changes

**State** is data that belongs to a component and can change over time. When state changes, React re-renders the component.

```tsx
const [selectedCategory, setSelectedCategory] = useState<string>('');
//      ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^          ^^^^^^
//      current value     function to update it        type
//      (read-only)       (triggers re-render)         initial value: ''
```

This is the `useState` hook. It returns a pair: the current value and a setter function. When you call the setter, React re-renders the component with the new value.

```tsx
// When user clicks a category button:
<Button onClick={() => setSelectedCategory('Bières')}>Bières</Button>

// React re-renders the component with selectedCategory = 'Bières'
// All code that uses selectedCategory now sees the new value
```

### Why not just use a variable?

```tsx
// This DOES NOT work:
let selectedCategory = '';
function handleClick() {
  selectedCategory = 'Bières'; // changes the variable...
  // ...but React doesn't know it changed, so nothing re-renders
}
```

`useState` is special because it tells React "this data changed, please re-render."

---

## Hooks — Reusable Logic

A **hook** is a function that starts with `use` and can use React features (state, effects, etc.). Our project uses hooks extensively.

### useState — manage a piece of state

```tsx
const [count, setCount] = useState(0);
setCount(count + 1); // triggers re-render
```

### useEffect — run code on mount/change

`useEffect` runs code when:
- The component first appears on screen (mount)
- Specific values change

```tsx
useEffect(() => {
  // This runs once when the component mounts
  api.refreshData();
}, []); // ← empty array = only on mount

useEffect(() => {
  // This runs every time `token` changes
  if (token) {
    checkAuthStatus();
  }
}, [token]); // ← runs when token changes
```

The array at the end is the **dependency array**. React compares values between renders — if any value changed, the effect runs again.

### useMemo — cache expensive calculations

```tsx
const filteredProducts = useMemo(() => {
  return products.filter(p => p.categoryId === selectedCategory);
}, [products, selectedCategory]);
// Only re-calculates when products or selectedCategory changes
// If neither changed, returns the cached result
```

### useCallback — cache functions

```tsx
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
// Returns the same function reference unless dependency changes
```

This prevents unnecessary re-renders of child components that receive the function as a prop.

---

## Custom Hooks — Our Project's Pattern

Custom hooks extract reusable logic from components. Our project uses this pattern everywhere:

```
usePOSState.ts  — manages all POS state (cart, dialogs, payment method, etc.)
usePOSLogic.ts  — computes derived values (totals, filtered products)
usePOSAPI.ts    — makes API calls (create order, process return)
```

A custom hook is just a function that uses other hooks:

```tsx
// usePOSState.ts (simplified)
export const usePOSState = (): [POSState, POSActions] => {
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  // ... more state ...

  const addToOrder = (item: OrderItem) => {
    setCurrentOrder(prev => [...prev, item]);
  };

  const clearOrder = () => {
    setCurrentOrder([]);
  };

  return [
    { currentOrder, paymentDialogOpen, ... },  // state values
    { addToOrder, clearOrder, setPaymentDialogOpen, ... }  // action functions
  ];
};
```

The component uses it cleanly:
```tsx
const POSContainer = () => {
  const [state, actions] = usePOSState();
  // state.currentOrder, state.paymentDialogOpen
  // actions.addToOrder(item), actions.clearOrder()
};
```

### Why this pattern?

1. **The component stays small** — it just renders UI and calls hooks
2. **Logic is testable** — you can test `usePOSLogic` without rendering any UI
3. **Logic is reusable** — another component could use `usePOSAPI` for the same API calls

---

## Component Tree — How Components Nest

React apps are trees of components. Here's the tree for the business interface:

```
App
 └── AppRouter
      ├── POSContainer
      │    ├── CategoryFilter
      │    ├── ProductGrid
      │    ├── OrderSummary
      │    └── PaymentDialog
      │         ├── PaymentMethodSelector
      │         ├── PaymentCalculator
      │         ├── PaymentConfirmation
      │         └── SplitPayment
      │
      ├── MenuContainer
      │    ├── CategorySection
      │    ├── ProductSection
      │    ├── CategoryDialog
      │    └── ProductDialog
      │
      ├── HappyHourControl
      ├── HistoryContainer
      │    ├── StatsCards
      │    ├── SearchBar
      │    └── OrdersTable
      │
      ├── Settings (SettingsContainer)
      │    ├── BusinessSettings
      │    ├── ClosureSettings
      │    ├── PrinterSettings
      │    └── PaymentSettings
      │
      ├── LegalComplianceDashboard
      ├── ClosureContainer
      ├── UserManagement
      └── AuditTrailDashboard
```

Each box is a `.tsx` file. Data flows down through props. Events flow up through callback props.

---

## Material-UI (MUI) — The Component Library

We don't write CSS from scratch. **Material-UI** provides pre-built, styled React components that follow Google's Material Design system.

```tsx
import { Button, TextField, Dialog, Grid, Paper, Chip } from '@mui/material';

// A styled button — no CSS needed
<Button variant="contained" color="primary" onClick={handlePay}>
  Payer
</Button>

// A text input field
<TextField label="Recherche" value={search} onChange={e => setSearch(e.target.value)} />

// A grid layout
<Grid container spacing={2}>
  <Grid item xs={12} md={8}>  {/* Full width on mobile, 8/12 on desktop */}
    <ProductGrid />
  </Grid>
  <Grid item xs={12} md={4}>  {/* Full width on mobile, 4/12 on desktop */}
    <OrderSummary />
  </Grid>
</Grid>
```

### The `sx` prop — inline styles

MUI uses the `sx` prop for styling:

```tsx
<Box sx={{
  display: 'flex',
  flexDirection: 'column',
  gap: 2,                    // 2 * 8px = 16px spacing
  mt: 3,                     // margin-top: 3 * 8px = 24px
  p: { xs: 1, sm: 2 },      // padding: 8px on mobile, 16px on desktop
}}>
```

`xs`, `sm`, `md`, `lg` are **breakpoints** — screen size thresholds for responsive design:
- `xs` — phone (0px+)
- `sm` — tablet (600px+)
- `md` — small laptop (900px+)
- `lg` — desktop (1200px+)

---

## React Router — Page Navigation

The app uses `react-router-dom` for navigation without page reloads:

```tsx
// In App.tsx:
<Routes>
  <Route path="/setup/:token" element={<BusinessSetupWizard />} />
  <Route path="/establishment-setup/:token" element={<EstablishmentAccountCreation />} />
  <Route path="/*" element={
    // ... main app with login/interface selection
  } />
</Routes>
```

`:token` is a URL parameter — like `req.params.token` in Express. The component reads it with `useParams()`.

For the business interface, we don't actually use Router for tabs — `AppRouter.tsx` uses MUI `Tabs` component with local state. The system admin interface uses real routes (`/system`, `/system/establishments`, etc.) rendered by `SystemAdminRouter.tsx`.

---

## The apiService — How the Frontend Talks to the Backend

`services/apiService.ts` is the single point of contact with the backend:

```tsx
export class ApiService {
  private static token: string | null = null;

  // Set the JWT token — called after login
  static setToken(token: string | null) {
    ApiService.token = token;
    apiCore.setToken(token);
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<{ data: T }> { ... }
  async post<T>(endpoint: string, data?: any): Promise<{ data: T }> { ... }
  async put<T>(endpoint: string, data?: any): Promise<{ data: T }> { ... }
  async delete<T>(endpoint: string): Promise<{ data: T }> { ... }

  // Domain methods
  async getProducts(): Promise<Product[]> { ... }
  async createOrder(order: { ... }): Promise<Order> { ... }
}
```

Under the hood, `apiCore` (in `services/api/core.ts`) uses the browser's `fetch` API and attaches the JWT token as an `Authorization` header:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
}
```

Every API call in the app goes through this. If the token expires, the call returns 401, and `useAuth` logs the user out.

---

## The API Config — Automatic URL Detection

`config/api.ts` figures out where the backend is:

1. In production (`mosehxl.com`) → use `https://mosehxl.com/api`
2. In development → try `http://localhost:3001`, then `http://127.0.0.1:3001`

It tests each URL with `fetch('/api/health')` and picks the first that responds.

---

## TypeScript in React — The Types

The `types/` folder defines every piece of data the frontend works with:

```typescript
// types/business.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  taxRate: number;
  categoryId: string;
  isActive: boolean;
  isHappyHourEligible: boolean;
  happyHourDiscountType: 'percentage' | 'fixed';
  happyHourDiscountValue: number;
}
```

Note: the frontend uses **camelCase** (`categoryId`, `taxRate`) while the backend/database uses **snake_case** (`category_id`, `tax_rate`). The `apiService` maps between them when sending/receiving data. This is a common convention — JavaScript/TypeScript convention is camelCase, SQL convention is snake_case.

---

## Error Boundaries — Catching Crashes

If a component throws an error during rendering, it can crash the entire app. **Error boundaries** catch these errors and show a fallback UI instead:

```tsx
// In common/ErrorBoundary.tsx (simplified concept):
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. <button>Retry</button></div>;
    }
    return this.props.children;
  }
}
```

You wrap sections of the app with error boundaries so a bug in one section doesn't take down everything.

---

## Summary

| Concept | What it does | Where in our project |
|---------|-------------|---------------------|
| Component | Reusable piece of UI | Every `.tsx` file in `components/` |
| Props | Data passed from parent to child | Every component interface (e.g., `POSContainerProps`) |
| State (`useState`) | Data that changes and triggers re-renders | All `use*State.ts` hooks |
| Effects (`useEffect`) | Code that runs on mount or data change | Auth check, data loading |
| Custom hooks | Reusable state + logic bundles | `hooks/usePOS*.ts`, `hooks/useHistory*.ts` |
| Material-UI | Pre-built styled components | `Button`, `TextField`, `Grid`, `Dialog`, etc. |
| React Router | URL-based navigation | `App.tsx`, `SystemAdminRouter.tsx` |
| apiService | HTTP calls to the backend | `services/apiService.ts` |
| Error boundaries | Catch rendering crashes | `components/common/ErrorBoundary/` |
