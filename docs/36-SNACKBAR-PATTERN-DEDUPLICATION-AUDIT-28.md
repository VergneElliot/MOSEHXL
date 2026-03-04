# Fix: Snackbar Pattern Deduplication (Audit #28)

This doc explains **why** the same snackbar state and helpers were copy-pasted in several hooks, **what** we changed by introducing a shared `useSnackbar` hook, and **how** to keep toast/notification logic in one place.

---

## 1. What is a snackbar?

A **snackbar** is a small, short-lived message that appears on screen (often at the bottom) to give quick feedback without blocking the rest of the UI. Typical uses:

- “Settings saved.”
- “Error: could not load data.”
- “Bulletin de clôture créé avec succès.”

It usually auto-hides after a few seconds and can be dismissed by the user. In this project it’s implemented with Material-UI’s `<Snackbar>` and `<Alert>`.

---

## 2. What was the problem?

The **same pattern** for controlling the snackbar was duplicated in **three** hooks:

- **useClosureState** — `snackbar` state (`open`, `message`, `severity`) plus `showSuccess`, `showError`, `closeSnackbar`, `setSnackbar`
- **useMenuState** — same
- **usePOSState** — same (and also supports `severity: 'info'`; POS uses `setSnackbar` for that)

So “how we show a success/error toast” was implemented three times: same state shape, same helpers, same logic.

**Why that’s a problem:**

- **Duplication:** Any change (e.g. duration, position, or adding a “showInfo”) had to be done in three places.
- **Drift:** One hook could be updated and the others forgotten, leading to inconsistent behaviour.
- **No single place:** There was no single hook that defined “how we show a snackbar in this app.”

*(The audit mentioned four hooks; the fourth, useHistoryState, uses different feedback (returnSuccess / returnError strings) and does not use a snackbar, so it was left as-is.)*

---

## 3. What we changed

### 3.1 Shared hook: useSnackbar

- **Added** `src/hooks/useSnackbar.ts`:
  - Holds a single `snackbar` state: `{ open, message, severity }` with `severity: 'success' | 'error' | 'info'`.
  - Exposes:
    - **showSuccess(message)** — opens snackbar with `severity: 'success'`
    - **showError(message)** — opens snackbar with `severity: 'error'**
    - **closeSnackbar()** — sets `open: false`
    - **setSnackbar** — for direct control (e.g. POS “info” messages).

So all “show a toast” logic lives in one hook.

### 3.2 Refactoring the three hooks

- **useClosureState:** Calls `useSnackbar()` once; removes its own `snackbar` state and `showSuccess` / `showError` / `closeSnackbar` implementations. Puts `snackbarApi.snackbar` into `state.snackbar` and `snackbarApi.showSuccess`, `showError`, `closeSnackbar`, `setSnackbar` into `actions`. `clearMessages()` now calls `snackbarApi.closeSnackbar()`.
- **useMenuState:** Same idea — uses `useSnackbar()`, drops local snackbar state and helpers, wires `state.snackbar` and the same actions from `snackbarApi`.
- **usePOSState:** Same; also adds **closeSnackbar** to the returned actions (previously the UI closed the snackbar via `setSnackbar({ ...snackbar, open: false })`). POSContainer now uses `actions.closeSnackbar()`.

The **public API** of each hook (state shape and action names) is unchanged, so existing components (ClosureContainer, MenuContainer, POSContainer) keep using `state.snackbar` and `actions.showSuccess` / `showError` / `closeSnackbar` as before. Only the implementation is centralized.

### 3.3 Type detail

- Closure and Menu types use `severity: 'success' | 'error'`. The shared hook uses `'success' | 'error' | 'info'`. Where we assign into Closure/Menu state we use a type assertion (`snackbarApi.snackbar as ClosureState['snackbar']`) so the narrower type is satisfied; at runtime only success/error are used there.

---

## 4. How to verify

1. **Build:** From `MuseBar`, run `npm run build`. It should succeed.
2. **Tests:** Run `npm test -- --testPathPattern="usePOSState" --watchAll=false`; all tests should pass.
3. **UI:** In the app, trigger success/error feedback (e.g. create a closure bulletin, save a menu category, complete a payment). The snackbar should still open with the right message and severity and close on dismiss or after a few seconds.

---

## 5. Takeaway

- **One pattern, one hook:** When several hooks or screens need the same “show a toast” behaviour, put the state and helpers in a single hook (e.g. `useSnackbar`) and call it from the others. That way duration, position, or new variants (e.g. `showInfo`) are implemented once.
- **Same API, shared implementation:** The feature hooks (useClosureState, useMenuState, usePOSState) still expose `snackbar`, `showSuccess`, `showError`, `closeSnackbar` so components don’t need to change; only the implementation is delegated to `useSnackbar`.
- **Snackbar = non-blocking feedback:** Use it for “saved”, “error”, “info” messages that don’t require a modal or a full-page state.
