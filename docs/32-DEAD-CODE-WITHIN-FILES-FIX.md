# Fix: Dead Code Within Files (Audit #24)

This doc explains **why** dead code inside files is a problem, **what** we removed or stubbed, and **how** to keep files lean and avoid leftover or unused code.

---

## 1. What was the problem?

The audit identified **dead code** in several files: code that is never executed, never called, or that served no real purpose (e.g. fake implementations, unused variables). Such code:

- **Increases cognitive load** when reading and refactoring.
- **Can mislead** (e.g. a “PDF export” that only returns a hardcoded skeleton).
- **Triggers linter warnings** (unused variables, unreachable code).
- **Adds maintenance cost** without delivering value.

The items were:

| Location | Dead code |
|----------|-----------|
| **middleware/errorHandler.ts** | MongoDB/Mongoose-style handling (ValidationError/CastError) — project is PostgreSQL-only. |
| **middleware/errorHandling.ts:92** | Sequelize reference — file not present in repo (may have been removed or audit typo). |
| **services/dataService.ts** | `initializeDefaultData()`, `saveData()`, `loadData()` — localStorage-era; never called. |
| **models/archiveService.ts** | Fake PDF: `convertToPDF()` returned a hardcoded PDF skeleton, not a real PDF. |
| **BusinessInfoValidator.ts** | `validateSiretChecksum()` — private, never called. |
| **hooks/usePerformanceMonitor.ts** | Unused `message` variable; console.log replaced with empty comment. |
| **ErrorBoundaryCore.tsx** | `reportError` declared but never assigned. |
| **utils/logger/performanceMonitor.ts** | `startTime` declared but never used in `time()`. |

---

## 2. What we changed

### 2.1 Backend: errorHandler.ts

- **Removed** the block that handled Mongoose-style `ValidationError` and `CastError` (e.g. `e.name === 'ValidationError'`, `e.name === 'CastError'`). The app uses **PostgreSQL** and **AppError**; Mongoose is not used. AppError (and our own ValidationError subclass) is already normalized at the top of `normalizeError()`.

### 2.2 Backend: errorHandling.ts

- **No change.** The file does not exist in the repo; the audit may refer to an older path or a since-removed file. If you ever add an `errorHandling.ts`, avoid Sequelize references unless the stack uses Sequelize.

### 2.3 Frontend: dataService.ts

- **Removed** the three unused methods and their logic:
  - **`initializeDefaultData()`** — seeded categories/products for an old localStorage-based flow; never called.
  - **`saveData()`** — wrote categories/products to localStorage; never called.
  - **`loadData()`** — called `getCategories()`/`getProducts()`; never called.
- Data is now loaded only via the existing API-backed `getCategories()` / `getProducts()` used by the app.

### 2.4 Backend: archiveService.ts

- **Replaced** the fake PDF implementation in **`convertToPDF()`**. It no longer returns a long hardcoded PDF skeleton. It now returns a short placeholder string:  
  `MuseBar export (${export_type}) — PDF generation not implemented.`  
- The export format `PDF` still works at the API level; when a real PDF library is integrated, this method can be replaced with real generation.

### 2.5 Backend: BusinessInfoValidator.ts

- **Removed** the private method **`validateSiretChecksum()`** (SIRET Luhn-style checksum). It was never called from anywhere. SIRET format/length is still validated in `validateBusinessInfo()`; if checksum validation is needed later, it can be reintroduced and wired in.

### 2.6 Frontend: usePerformanceMonitor.ts

- **Removed** the unused **`message`** variable.
- **Restored** real logging: when `logToConsole` is true and a slow render is detected, we now call **`console.warn()`** with the component name and render time; in development we call **`console.debug()`** for normal render times. Empty comment blocks were replaced with these calls so the hook actually logs when configured.

### 2.7 Frontend: ErrorBoundaryCore.tsx

- **Removed** the unused property **`reportError`** (declared but never assigned or called). Error reporting can be added later via props or a dedicated service and wired in explicitly.

### 2.8 Backend: utils/logger/performanceMonitor.ts

- **Removed** the unused **`startTime`** variable from **`time()`**. The method already uses `startTimer()`, which tracks time internally; the extra `startTime` was redundant and never used.

---

## 3. How to verify

1. **Backend build:** From `MuseBar/backend`, run `npm run build`. Should succeed.
2. **Frontend build:** From `MuseBar`, run `npm run build`. Should succeed.
3. **Linting:** Run the project’s lint script; there should be no new warnings for the touched files (unused variables/declarations removed).
4. **Archive export:** Call the archive export API with format `PDF`; response should contain the placeholder text, not the old fake PDF skeleton.
5. **Performance hook:** In development, trigger a slow render above the threshold; the console should show the `console.warn` message when `logToConsole` is enabled.

---

## 4. Takeaway

- **Dead code** includes: unreachable branches, unused methods/variables, and “fake” implementations that don’t deliver real behaviour.
- Prefer **removing** dead code over commenting it out; version control keeps history if needed.
- For **optional features** (e.g. PDF export), a small **stub or placeholder** is better than a large fake implementation that looks real but isn’t.
- Run **lint and typechecks** regularly; they catch many unused declarations and help keep files clean.
