# Fix: Dead Frontend Modules and Unused Middleware (Audit #23)

This doc explains **why** unused frontend directories and an unused route middleware were a problem, **what** we removed or wired in, and **how** to avoid dead code and unused middleware in the future.

---

## 1. What was the problem?

### 1.1 Frontend: common/skeletons/ and common/loadingStates/

- **common/skeletons/** (6 files: dashboardSkeletons, layoutSkeletons, transactionSkeletons, formSkeletons, basicSkeletons, index.tsx) was **never imported** anywhere. The barrel `common/index.ts` exports skeleton-related components from **`./Skeletons`** (the file `Skeletons.tsx`), not from `./skeletons/`. So the entire **skeletons/** directory was dead code.
- **common/loadingStates/** (4 files: index.tsx, spinners, buttons, states) was **not exported** from `common/index.ts`. No other file imported from `loadingStates/`. So the entire **loadingStates/** directory was dead code.

Dead code adds maintenance cost, confuses “where do I add a new skeleton?” and can cause drift (e.g. someone updates one place but not the other). Removing it keeps the tree clear and avoids accidental reuse of outdated components.

### 1.2 Backend: validateBusinessInfo not in the route chain

- **routes/establishmentAccountCreation/middleware/validateBusinessInfo.ts** was **imported** in the route file but **never used** in the route chain. The POST `/complete` handler validated the body and invitation but did not run `validateBusinessInfo`, so business info (businessType, address, city, postalCode, etc.) was not validated by that middleware before calling the service. The middleware existed and was correct; it was simply never attached to any route.

So we had dead frontend modules and an unused (but useful) backend middleware.

---

## 2. What we changed

### 2.1 Removed dead frontend directories

- **Deleted** the entire **common/skeletons/** directory (all 6 files). No code was importing from it; the only skeleton exports used by the app come from **common/Skeletons.tsx** (exported via `common/index.ts`).
- **Deleted** the entire **common/loadingStates/** directory (all 4 files). No code was importing from it, and it was not exported from `common/index.ts`. Loading UI is provided by other common components (e.g. LoadingSpinner, LoadingButton).

No import path changes were required; nothing referenced these directories.

### 2.2 Wired validateBusinessInfo into the route chain

- In **routes/establishmentAccountCreation/index.ts**, the POST `/complete` chain was updated to:
  - Run **validateBody** (token, password, businessInfo required),
  - then **validateInvitation**,
  - then **validateBusinessInfo** (new),
  - then the async handler.
- The handler now uses **`req.validatedBusinessInfo ?? req.body.businessInfo`** so it uses the validated business info when the middleware has run (and falls back to body for type compatibility). The service still receives the same shape; validation now runs in the route layer before the service is called.

So the middleware is no longer dead: it runs on every POST `/complete` and rejects invalid business info with 400 and details before the account creation service is invoked.

---

## 3. How to verify

1. **Frontend build:** From MuseBar, run `npm run build`. It should succeed; no references to `skeletons/` or `loadingStates/` remain.
2. **Backend build:** From MuseBar/backend, run `npm run build`. It should succeed.
3. **Route behaviour:** POST to `/api/establishment-account-creation/complete` with invalid business info (e.g. missing businessType or city) should return 400 with validation details. Valid payloads should still complete account creation.

---

## 4. Takeaway

- **Remove truly dead code:** If a directory (or file) is never imported and not part of the public API, remove it. It reduces noise and prevents accidental use of unmaintained code. If you need similar components later, you can reintroduce them in a single, exported place (e.g. Skeletons.tsx or a new directory that is exported from a barrel).
- **Export or remove:** If you add a directory of components (e.g. loadingStates), either export it from a parent barrel and use it somewhere, or remove it. “Add and never wire” creates dead code.
- **Use middleware you write:** If you add route middleware (e.g. validateBusinessInfo), attach it to the appropriate route chain. Unused middleware is dead code and leaves validation gaps (e.g. business info only validated inside the service instead of at the route boundary).
