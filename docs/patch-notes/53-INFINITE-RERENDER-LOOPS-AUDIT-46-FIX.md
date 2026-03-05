# Fix: Potential Infinite Re-render Loops (Audit #46)

This doc explains **why** passing hook return objects as `useEffect` dependencies could cause infinite re-renders, **what** we changed (memoize the API object in the hooks), and **how** to keep dependencies stable.

---

## 1. Background: How React re-renders work

To understand this bug, you need to know three things about React:

### 1.1 Re-rendering

Every time a component's **state** changes (via `useState`'s setter), React **re-renders** the component — it calls the component function again from top to bottom, recalculating everything and producing new UI. This is normal and expected.

### 1.2 useEffect and dependencies

`useEffect` is a hook that runs code **after** a render, but only when certain values change:

```tsx
useEffect(() => {
  loadData();        // This runs...
}, [someValue]);     // ...only when someValue changes between renders
```

React compares `someValue` from the previous render to `someValue` from the current render. If they're different, the effect runs. If they're the same, it's skipped.

### 1.3 Object identity (the trap)

Here's the critical part. In JavaScript, **two objects with the same contents are NOT considered equal** if they're different references:

```javascript
const a = { name: "Alice" };
const b = { name: "Alice" };
console.log(a === b);  // false! They look the same but they're different objects in memory
```

So if a custom hook returns a **new object** every time the component renders:

```tsx
function useMyAPI() {
  return { loadData, saveData };  // new object reference every render
}
```

Then any `useEffect` that depends on this object will run **every single render**, because React sees a "new" object each time.

---

## 2. What was the problem?

Three containers used a pattern like this:

```tsx
const api = useClosureAPI(...);  // returns { loadBulletins, refreshAllData, ... }

useEffect(() => {
  api.refreshAllData();  // Fetch data on mount
}, [api]);               // Dependency: the api object
```

The problem was: `useClosureAPI` returned a **plain object** built fresh on every render:

```tsx
return {
  loadBulletins,
  refreshAllData,
  // ...
};
```

This created an infinite loop:

1. Component renders → hook returns a **new** `api` object (new reference)
2. `useEffect` sees `api` changed (new reference ≠ old reference) → runs the effect
3. Effect calls `api.refreshAllData()` → updates state (e.g., sets bulletins data)
4. State change causes a **re-render** → go back to step 1
5. Loop forever (or until the browser tab crashes)

The same issue existed in `useHistoryAPI` and `useMenuAPI`.

---

## 3. The fix: useMemo

React provides `useMemo` — a hook that **caches** a value and only recalculates it when specific dependencies change:

```tsx
const api = useMemo(() => ({
  loadBulletins,
  refreshAllData,
  // ...
}), [loadBulletins, refreshAllData, /* ... */]);
```

Now the `api` object is **the same reference** across renders (as long as the individual functions haven't changed). Since the functions are themselves wrapped in `useCallback` (another memoization hook), they don't change unless their inputs change. So the `api` object stays stable, and the `useEffect` only runs on mount — not in a loop.

### What is "memoization"?

**Memoization** means "remembering" a previously computed result so you don't recompute it unnecessarily. In React:

- `useMemo` memoizes a **value** (like an object or a calculation result)
- `useCallback` memoizes a **function** (so the same function reference is reused)

Both take a dependency array — the cached value is only recalculated when a dependency changes.

---

## 4. What was changed

### 4.1 useClosureAPI
- **File:** `MuseBar/src/hooks/useClosureAPI.ts`
- Wrapped the return object in `useMemo(() => ({ ... }), [callbacks])` so the same reference is returned when callbacks are unchanged.

### 4.2 useHistoryAPI
- **File:** `MuseBar/src/hooks/useHistoryAPI.ts`
- Same approach: `return useMemo(() => ({ loadOrders, loadStats, processReturn, refreshData }), [loadOrders, loadStats, processReturn, refreshData])`.

### 4.3 useMenuAPI
- **File:** `MuseBar/src/hooks/useMenuAPI.ts`
- Added `useMemo` import and wrapped the return object.

No changes were needed in the container components (ClosureContainer, HistoryContainer, MenuContainer). They continue to use `[api]` as a dependency. The fix is entirely in the hooks — the hooks now return a **stable reference**, so the effect runs only when it should (on mount, or when an actual input changes).

---

## 5. How to verify

1. **Open Closure / History / Menu screens.** Confirm there are no infinite loading spinners or repeated network requests. The initial data load should happen once.
2. **Menu "show archived" toggle.** Toggle the archive view; the effect should run when the toggle changes, not in a loop.
3. **React DevTools Profiler** (if available): Confirm the containers don't re-render continuously after mount.

---

## 6. Summary

| Before (audit #46) | After |
|--------------------|--------|
| useClosureAPI / useHistoryAPI / useMenuAPI returned a new object every render | Each hook returns `useMemo(() => ({ ... }), [callbacks])` — stable reference |
| useEffect(..., [api]) saw a "new" api every render → infinite loop risk | Same api reference across renders → effect runs only when intended |
| Containers unchanged | Containers unchanged; fix is in the hooks |

**Key lesson:** When a custom hook returns an object that will be used as a `useEffect` dependency, always wrap it in `useMemo` to keep the reference stable. Otherwise, every render creates a "new" object that triggers the effect again, potentially causing an infinite loop.
