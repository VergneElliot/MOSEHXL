# Fix: Debug Info Leaked to All Users (Audit #20)

This doc explains **why** showing backend URL, host, and init status on the login screen was a problem, **what** we removed so that information is no longer exposed to every user, and **how** to keep the login flow working without leaking infrastructure details.

---

## 1. What was the problem?

In **MuseBar/src/components/Auth/Login.tsx**, the component had:

- A **`debugInfo`** state string, populated in a `useEffect` by calling the API config, then formatting:  
  `Backend: ${baseURL} | Host: ${currentHost} | Ready: ${isInitialized}` (or a debug error message).
- An **`<Alert severity="info">`** that rendered **`Debug: {debugInfo}`** for every user whenever `debugInfo` was set.

So on the **public login page**, every user (including unauthenticated visitors and production users) saw:

- The **backend base URL** (e.g. `https://api.example.com` or an internal hostname).
- The **current host** the frontend thought it was talking to.
- Whether the API config was **initialized** (“Ready: true/false”).

That is **debug/infrastructure information**. It should not be part of the normal user-facing UI.

**Why it’s a problem:**

- **Information disclosure:** Reveals internal or staging URLs, hostnames, or environment layout. Attackers can use this to target the real API or understand your setup.
- **No user benefit:** Ordinary users don’t need to see backend URL or init status to log in. This was left over from development/debugging.
- **Consistent exposure:** Because the Alert was shown whenever `debugInfo` was non-empty, it was visible in all environments (dev, staging, production) to everyone who opened the login page.

So the fix is: **stop rendering any of this debug information** to users, while still ensuring the API config is initialized so login continues to work.

---

## 2. Why this matters

- **Principle of least disclosure:** The UI should only show what the user needs. Backend URLs, hostnames, and init flags are for developers and operators, not for the login screen.
- **Security hygiene:** Avoid exposing internal details (URLs, hostnames, environment) in the client. If you need them for debugging, use dev-only tools (e.g. a dev-only panel, or `process.env.NODE_ENV === 'development'`) and never ship them to production UI for all users.
- **Clean UX:** The login page should show a clear form and error messages (e.g. “Erreur réseau ou serveur”), not technical debug lines.

So we remove the debug state and the Alert, and keep only the logic that **initializes** the API config so that login requests can be sent to the correct backend.

---

## 3. What we changed

- **Removed** the **`debugInfo`** state and all code that set it (`setDebugInfo(...)` in the success and catch paths).
- **Removed** the **`<Alert>`** that displayed “Debug: {debugInfo}”.
- **Kept** the **`useEffect`** that runs on mount, but only to **initialize the API config**: it still dynamically imports `apiConfig` and calls `apiConfig.initialize()`. We don’t call `getConnectionInfo()` or display anything. If initialization fails, we no longer set a visible debug message; the user will still see a normal login error (e.g. network/server error) if they try to submit and the backend is unreachable.

So: **same initialization behaviour**, **no debug output** on the login screen.

---

## 4. How to verify

1. **Login page:** Open the app and go to the login screen. You should **not** see any “Debug: Backend: … | Host: … | Ready: …” (or similar) Alert. Only the login form and, when applicable, the error Alert (e.g. wrong credentials or network error) should appear.
2. **Login still works:** Enter valid credentials and submit. Login should succeed as before; the API config is still initialized on mount.
3. **Network:** If the backend is down or misconfigured, the user should still get a generic error (e.g. “Erreur réseau ou serveur”) when they try to log in, not a debug line on the page.

---

## 5. Takeaway

- **Don’t show infrastructure/debug info in production UI:** Backend URLs, hostnames, and init status are not for end users. Remove them from the login (and any other) screen that is visible to all users.
- **If you need debug info during development:** Use a dev-only branch (e.g. `process.env.NODE_ENV === 'development'`), a separate debug panel, or browser devtools — and never render it in the same UI that production users see.
- **Keep initialization, drop the display:** The `useEffect` that calls `apiConfig.initialize()` is still required so that the app knows where to send login requests. We only removed the part that turned connection info into visible text for every user.
