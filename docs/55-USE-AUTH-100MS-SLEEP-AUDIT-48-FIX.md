# Fix: 100ms Sleep Hack in useAuth (Audit #48)

This doc explains **why** the 100ms delay in useAuth was a race-condition hack, **what** we changed (remove it and rely on apiConfig gating), and **how** initialization should be handled.

---

## 1. What was the problem?

In **useAuth.ts**, **checkAuthStatus** contained:

```ts
// Add delay to ensure API is ready
await new Promise(resolve => setTimeout(resolve, 100));

// Ensure API config is ready
if (!apiConfig.isReady()) {
  await apiConfig.initialize();
}
```

So the code first waited 100ms, then checked/initialized API config. The comment implied the delay was there to “ensure API is ready.”

That’s a **race-condition workaround**:

- **Arbitrary delay:** 100ms might be too short (backend or apiConfig still not ready) or too long (unnecessary wait every time).
- **No real guarantee:** Nothing ensures the API is actually ready after 100ms; it only hopes that something else has initialized in that time.
- **Proper mechanism already present:** The next block already gates on `apiConfig.isReady()` and calls `await apiConfig.initialize()` when needed. That is the correct way to wait for the API layer.

So the audit point **“100ms sleep hack — race condition; should use proper initialization gating”** is correct: the sleep should be removed and initialization should rely only on explicit gating.

---

## 2. What was changed

- **File:** `MuseBar/src/hooks/useAuth.ts`
- **Removed:** The 100ms `await new Promise(resolve => setTimeout(resolve, 100))` and its comment.
- **Kept:** The existing gating: `if (!apiConfig.isReady()) { await apiConfig.initialize(); }`.
- **Comment:** Replaced with a short note that we gate on API config and do not use a sleep (audit #48).

So **checkAuthStatus** now:

1. Checks if API config is ready.
2. If not, awaits `apiConfig.initialize()` (which probes the backend and sets the base URL).
3. Then calls `apiService.get('/auth/me')`.

No arbitrary delay; we only proceed after the config is ready. **refreshToken** already used the same gating without a sleep; no change there.

---

## 3. How to verify

1. **Login / reload with stored token:** Open the app with a stored auth token so checkAuthStatus runs. Auth should still succeed; the first time, `apiConfig.initialize()` may run (health checks), then `/auth/me` is called.
2. **No 100ms in code:** Search for `setTimeout(resolve, 100)` or “100” in useAuth; the sleep should be gone.
3. **Slow backend:** If the backend is slow to start, the correct behavior is that `apiConfig.initialize()` may take a few seconds (health probe timeout); we no longer “hope” that 100ms is enough.

---

## 4. Summary

| Before (audit #48) | After |
|--------------------|--------|
| 100ms sleep then apiConfig check | No sleep; only apiConfig gating |
| Race: “hope API is ready after 100ms” | Explicit: wait for apiConfig.initialize() when not ready |
| Fragile and arbitrary | Single, proper initialization gate |

useAuth now uses proper initialization gating (apiConfig.isReady / apiConfig.initialize) and no sleep hack (audit #48).
