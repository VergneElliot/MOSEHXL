# Fix: Potential Infinite Re-render Loops (Audit #46)

This doc explains **why** passing hook return objects as `useEffect` dependencies could cause infinite re-renders, **what** we changed (memoize the API object in the hooks), and **how** to keep dependencies stable.

---

## 1. What was the problem?

Three containers use a pattern like this:

- **ClosureContainer:** `useEffect(() => { api.refreshAllData(); }, [api]);`
- **HistoryContainer:** `useEffect(() => { api.refreshData(); }, [api]);`
- **MenuContainer:** `useEffect(() => { ... api.loadArchivedProducts(); ... }, [state.showArchived, api]);`

In each case, **`api`** is the return value of a custom hook (`useClosureAPI`, `useHistoryAPI`, `useMenuAPI`). Those hooks returned a **plain object** built on every render, e.g.:

```ts
return {
  loadBulletins,
  refreshAllData,
  // ...
};
```

In JavaScript, **each render creates a new object reference**. So:

1. Container renders → hook returns a new `api` object.
2. `useEffect` runs because `api` (dependency) changed.
3. Effect calls `api.refreshAllData()` (or similar), which updates state.
4. State update causes a re-render → hook returns a **new** `api` again.
5. Effect runs again → loop.

So **if the hook doesn’t memoize its return value**, the dependency `[api]` changes every time, and the effect can run repeatedly and cause infinite re-renders (or at least unnecessary refetches and flicker).

---

## 2. What was changed

We **memoized the returned API object** in all three hooks so the reference stays stable when the underlying callbacks are unchanged.

### 2.1 useClosureAPI

- **File:** `MuseBar/src/hooks/useClosureAPI.ts`
- The hook already used `useCallback` for each method. The **return** was changed from a plain object to **`useMemo(() => ({ ... }), [loadBulletins, loadTodayStatus, ...])`** so the same object reference is returned when those callbacks are unchanged.

### 2.2 useHistoryAPI

- **File:** `MuseBar/src/hooks/useHistoryAPI.ts`
- Same idea: **`return useMemo(() => ({ loadOrders, loadStats, processReturn, refreshData }), [loadOrders, loadStats, processReturn, refreshData])`**. The callbacks were already `useCallback`’d; the returned object is now memoized.

### 2.3 useMenuAPI

- **File:** `MuseBar/src/hooks/useMenuAPI.ts`
- Added **`useMemo`** import and wrapped the return object in **`useMemo(..., [createCategory, updateCategory, ...])`** so the `api` reference is stable when the methods are stable.

No changes were made in the containers (ClosureContainer, HistoryContainer, MenuContainer). They continue to use `[api]` (and in MenuContainer `[state.showArchived, api]`). The fix is entirely in the hooks: the **hooks** now return a stable reference when their inputs and internal callbacks are stable, so the effect runs only when it should (e.g. mount, or when `state.showArchived` changes in MenuContainer).

---

## 3. How to verify

1. **Closure / History / Menu screens:** Open each screen and confirm there are no infinite loading or repeated network requests. The initial load should run once (mount), not in a loop.
2. **Menu “show archived”:** Toggle “Afficher les éléments archivés”; the effect that loads archived data should run when the toggle changes, not on every render.
3. **React DevTools / Profiler:** If available, confirm that the containers don’t re-render in a tight loop after mount.

---

## 4. Summary

| Before (audit #46) | After |
|--------------------|--------|
| useClosureAPI / useHistoryAPI / useMenuAPI returned a new object every render | Each hook returns `useMemo(() => ({ ... }), [callbacks])` so the api object reference is stable |
| useEffect(..., [api]) saw a new api every time → risk of infinite loop | Same api reference across renders when callbacks are stable → effect runs only when intended |
| Containers unchanged | Containers unchanged; fix is in the hooks |

By memoizing the hook return values, we keep the dependency `[api]` stable and avoid potential infinite re-render loops (audit #46).
