# Fix: React Router Types Mismatch (Audit #32)

This doc explains **why** using `@types/react-router-dom` for v5 while the app runs `react-router-dom` v6 is wrong, **what** we changed, and **how** to keep types aligned with the library version.

---

## 1. Why do types need to match the library?

TypeScript types describe the **shape** of a library’s API (props, return types, hooks). If you install types for **version A** of a library but actually use **version B**, you get:

- **Wrong types:** e.g. v5’s `Route` has different props than v6’s; `useHistory` (v5) vs `useNavigate` (v6).
- **False errors or false safety:** TypeScript may complain about valid v6 code, or accept invalid code that matches the old v5 types.
- **Confusion:** Types and runtime behaviour don’t match.

So types must match the **major version** of the library you’re running.

---

## 2. What was the problem?

The frontend had:

- **react-router-dom**: `^6.30.1` (v6) — used everywhere: `<Routes>`, `<Route>`, `useNavigate`, `useParams`, `useSearchParams`, `<BrowserRouter>`, `<Navigate>`.
- **@types/react-router-dom**: `^5.3.3` — types for **React Router v5** from DefinitelyTyped.

So we were typing a **v6** API with **v5** type definitions. That can cause:

- Incorrect or missing type information for v6 APIs.
- Possible conflicts if both the package’s own types and `@types` are resolved (v6 ships its own types; the duplicate can confuse the compiler or IDE).

**React Router v6** ships TypeScript types **inside the package**. You don’t need (and shouldn’t use) `@types/react-router-dom` when you’re on v6.

---

## 3. What we changed

- **Removed** `@types/react-router-dom` from `MuseBar/package.json` dependencies.
- Ran `npm install` so the lockfile no longer pulls in the v5 types package.

No code changes: the app was already using v6 APIs; TypeScript now uses the types that come with `react-router-dom@6.x` instead of the outdated v5 types.

---

## 4. How to avoid this in the future

- **Check whether the library ships types:** Many modern packages (React Router v6, many MUI packages) include their own `.d.ts` or typed source. In that case, **don’t** add a separate `@types/...` for that package.
- **Match major versions:** If you do use `@types/foo`, its major version should align with `foo` (e.g. don’t use `@types/react-router-dom@5` with `react-router-dom@6`).
- **npm info:** You can run `npm info react-router-dom types` or check the package’s `types` / `typings` field to see if it bundles types.

---

## 5. Summary

| Before | After |
|--------|--------|
| react-router-dom@6 + @types/react-router-dom@5 | react-router-dom@6 only |
| Types from DefinitelyTyped (v5 API) | Types from the package (v6 API) |

**Takeaway:** When a library ships its own TypeScript types (like React Router v6), remove the corresponding `@types/...` package so the compiler and IDE use the correct, up-to-date definitions.
