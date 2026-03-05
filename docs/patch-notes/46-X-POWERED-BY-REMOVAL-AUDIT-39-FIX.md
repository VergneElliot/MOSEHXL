# Fix: Remove X-Powered-By Header (Audit #39)

This doc explains **why** sending `X-Powered-By` (e.g. "MuseBar") is a bad idea, **what** we changed (removed it entirely from the security headers middleware), and **how** reducing server fingerprinting fits into defense in depth.

---

## 1. What was the problem?

In `middleware/security/SecurityHeaders.ts`, the security headers middleware set:

```ts
'X-Powered-By': config.app.name,  // e.g. "MuseBar"
```

So every response included `X-Powered-By: MuseBar`, advertising the application name to anyone who could see the response headers (browsers, proxies, scanners).

### Why this is bad

- **Information disclosure:** The header tells attackers exactly which stack or app is in use. That makes it easier to look up known vulnerabilities and target exploits (e.g. "MuseBar" + version, or infer Node/Express). There is no benefit to the client from knowing this; it only helps reconnaissance.
- **Best practice:** Security guidance (e.g. OWASP, Express security best practices) recommends **removing** or not setting `X-Powered-By`. Express itself can send `X-Powered-By: Express`; many production apps disable it. Setting it to the app name is strictly worse than not sending it at all.
- **Consistency:** Other security headers in the same middleware (X-Frame-Options, CSP, etc.) are there to harden the app. Sending a "server identification" header undermines that by giving away free information.

So we had **unnecessary fingerprinting** and **weaker** defense in depth.

---

## 2. Core concepts

### 2.1 Server fingerprinting

**Fingerprinting** means inferring or learning what software (and sometimes version) is running on a server. Headers like `X-Powered-By`, `Server`, and sometimes `Via` or framework-specific headers contribute to that. The less an attacker can infer, the harder it is to tailor exploits. Removing or not setting these headers is a small but standard hardening step.

### 2.2 X-Powered-By specifically

- **Origin:** Often set by frameworks (e.g. Express, PHP) to the framework name.
- **Problem:** It’s optional and not required by any standard. Clients don’t need it for functionality. It only helps someone building a picture of your stack.
- **Fix:** Don’t set it. If the framework sets it by default, disable it (e.g. `app.disable('x-powered-by')` in Express). We were **explicitly** setting it to the app name; we simply removed that line.

### 2.3 Defense in depth

Security doesn’t rely on one measure. Removing a single header doesn’t make you invulnerable, but it reduces the low-hanging fruit: fewer clues means slightly more work for an attacker and fewer “search CVE for X” wins. This change is one small layer in that approach.

---

## 3. What we changed

**File:** `MuseBar/backend/src/middleware/security/SecurityHeaders.ts`.

- **Removed:** The line `'X-Powered-By': config.app.name` and the associated `// Server identification` comment from the headers object in `applySecurityHeaders()`.
- **Result:** Responses from this app no longer include `X-Powered-By`. No other headers or behavior were changed.

**Note:** If Express is still adding its own `X-Powered-By: Express` elsewhere, that would be a separate step (e.g. `app.disable('x-powered-by')` in `app.ts`). This fix removes the **explicit** MuseBar value from our security headers middleware.

---

## 4. How to verify

- **Manual:** Send a request to any API endpoint (e.g. `GET /api/health`) and inspect response headers. `X-Powered-By` should be absent (or, if present from Express, not "MuseBar").
- **Automated:** Any test or script that asserts on security headers can be updated to expect the absence of `X-Powered-By` (or to allow only a generic value if you later decide to suppress Express’s default instead).

---

## 5. Summary

| Topic | Takeaway |
|--------|----------|
| **X-Powered-By** | Don’t set it; remove or disable it to avoid unnecessary server fingerprinting. |
| **Fingerprinting** | Reducing identifiable headers makes targeted exploitation slightly harder. |
| **Defense in depth** | Small hardening steps (like dropping one header) add up. |
| **Audit #39** | The security headers middleware no longer sets `X-Powered-By: MuseBar`; the header is removed entirely from our response. |

**Audit #39:** X-Powered-By set to app name — fixed by removing the header from the security headers middleware.
