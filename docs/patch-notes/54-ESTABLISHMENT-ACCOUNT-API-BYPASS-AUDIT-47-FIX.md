# Fix: establishmentAccountApi Bypasses Centralized API Layer (Audit #47)

This doc explains **why** using raw `fetch()` in a separate service was a problem, **what** we changed (use `request()` from api/core), and **how** the centralized layer behaves.

---

## 1. What was the problem?

**establishmentAccountApi.ts** was implemented with raw `fetch()` and its own base URL:

- **Own base URL:** `const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'` — duplicated URL logic instead of using the shared api config that detects backend and supports REACT_APP_API_URL.
- **No auth token:** Requests did not send `Authorization: Bearer <token>`. If any of these endpoints later require an authenticated context, they would not have it.
- **No timeout:** No AbortController or timeout; long-hanging requests could run indefinitely.
- **No 401 handling:** The centralized layer in **api/core.ts** clears an invalid token and redirects to `/login` on 401. The establishment-account service did not use that, so behavior differed from the rest of the app.

So the audit point **"establishmentAccountApi.ts bypasses centralized API layer — uses raw fetch() with its own base URL, missing auth token injection, timeout handling, and 401 redirects"** was accurate.

---

## 2. What was changed

### 2.1 establishmentAccountApi uses api/core

- **File:** `MuseBar/src/services/establishmentAccountApi.ts`
- **Before:** A class with a private `baseUrl` and three methods that called `fetch(this.baseUrl + path, ...)` with manual headers and error parsing.
- **After:** The service now uses **`request<T>(endpoint, options)`** from **`./api/core`** for all three operations:
  - **validateInvitation(token):** `request<InvitationValidationResult>('/establishment-account-creation/validate/' + encodeURIComponent(token))`
  - **createAccount(body):** `request('/establishment-account-creation/complete', { method: 'POST', body: JSON.stringify(body) })`
  - **checkHealth():** `request('/establishment-account-creation/health')`
- The export **`establishmentAccountApi`** is kept as a plain object `{ validateInvitation, createAccount, checkHealth }` so existing call sites (`establishmentAccountApi.validateInvitation(...)`, etc.) do not need to change.

Effects:

- **Base URL:** Comes from `apiConfig` (same as the rest of the app; supports auto-detection and REACT_APP_API_URL).
- **Auth:** If `setToken()` has been called, `request()` adds `Authorization: Bearer <token>`; if not (e.g. pre-login setup), no header is sent.
- **Timeout:** core uses a 15s AbortController timeout; establishment-account calls get the same behavior.
- **401:** core clears `auth_token` and redirects to `/login`; establishment-account calls now get that behavior too.

### 2.2 api/core error body for non-401

- **File:** `MuseBar/src/services/api/core.ts`
- When `!res.ok` and **status is not 401**, the thrown error message is now taken from the response body when possible: the code tries `await res.json()` and uses `body.error` if it is a string; otherwise it keeps the generic `HTTP error! status: ${res.status}`. So backend error messages (e.g. "Invitation expired") are preserved for validate/createAccount while 401 still triggers the existing redirect and a fixed message.

---

## 3. How to verify

1. **Establishment account creation flow:** Run the flow (validate invitation, complete account). It should still succeed; base URL and timeouts are shared with the rest of the app.
2. **Network:** In devtools, confirm requests go to the same API base as other app requests and that a 15s timeout applies.
3. **Auth (if applicable):** If you add auth to these endpoints later, the same token set via `setToken()` will be sent automatically.
4. **401:** If the backend returns 401 (e.g. expired session), the app should clear the token and redirect to login as with other api/core requests.

---

## 4. Summary

| Before (audit #47) | After |
|--------------------|--------|
| Raw fetch() with own API_BASE_URL | request() from api/core (shared config, base URL) |
| No Authorization header | Token injected by core when setToken() has been called |
| No timeout | 15s timeout via AbortController in core |
| No 401 redirect | 401 clears token and redirects to /login (same as rest of app) |
| Custom error parsing only in establishment API | core parses error body for non-401; one place for behavior |

establishmentAccountApi now goes through the centralized API layer and gets the same auth, timeout, and 401 handling as api/core (audit #47).
