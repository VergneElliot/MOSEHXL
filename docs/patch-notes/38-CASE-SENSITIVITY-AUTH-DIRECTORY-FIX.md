# Fix: Case Sensitivity — Auth/ vs auth/ (Cross-Platform)

This doc explains **why** having two directories that differ only by case (`Auth/` and `auth/`) is a bug on macOS and Windows, **what** we changed to use a single lowercase `auth/` directory, and **how** to avoid this class of problem in the future.

---

## 1. Why does case matter?

File systems treat path casing differently:

| OS / FS        | Typical behaviour |
|----------------|-------------------|
| **Linux**      | **Case-sensitive.** `Auth` and `auth` are two different directories. Both can exist at once. |
| **macOS** (APFS/HFS+) | **Case-insensitive by default.** `Auth` and `auth` refer to the **same** directory. You cannot have both. |
| **Windows**    | **Case-insensitive.** Same as macOS; `Auth` and `auth` are the same path. |

So on Linux you can have:

- `MuseBar/src/components/Auth/` (Login.tsx, index.ts)
- `MuseBar/src/components/auth/` (AccountSetupForm, InvitationValidation, etc.)

and both exist. On macOS or Windows, the second checkout or clone might overwrite or merge into the first, or one path “wins” and the other is missing. Builds and imports can then fail or resolve to the wrong files.

**Why it’s a problem:**

- **Works on Linux, breaks elsewhere:** CI or dev on Linux can pass while teammates on macOS/Windows see broken or inconsistent behaviour.
- **Unpredictable resolution:** With one logical directory and two casings in the codebase, imports like `from './Auth'` vs `from './auth'` may resolve to different folders on different systems.
- **Git and renames:** Git tracks path names as given. Renaming only by case (e.g. `Auth` → `auth`) can be tricky on case-insensitive file systems; the safest approach is to merge into one directory with a single, consistent name.

---

## 2. What was in the codebase?

The frontend had **two** component directories differing only by case:

| Directory (logical) | Contents |
|--------------------|----------|
| **Auth/** (capital A) | `Login.tsx`, `index.ts` (exporting Login) |
| **auth/** (lowercase) | `AccountSetupForm.tsx`, `InvitationSuccess.tsx`, `InvitationValidation.tsx`, `PasswordResetRequest.tsx`, `PasswordResetForm.tsx` |

Imports:

- **App.tsx** used `import { Login } from './components/Auth'` (capital A).
- **InvitationAcceptance.tsx** and **PasswordReset.tsx** used `import { … } from './auth/…'` (lowercase).

On a case-insensitive system, both `Auth` and `auth` point to the same directory, so either some files “disappear” or the structure is ambiguous.

---

## 3. What we changed

### 3.1 Single directory: lowercase `auth/`

We kept **one** directory and chose **lowercase** `auth/`:

- Common convention for folder names is lowercase (e.g. `components/auth`, `utils/formatCurrency`).
- All auth-related components now live under **`MuseBar/src/components/auth/`**.

### 3.2 Merging the two directories

1. **Moved** `Auth/Login.tsx` into `auth/Login.tsx` using `git mv` so Git records the rename correctly.
2. **Added** `auth/index.ts` that exports Login: `export { default as Login } from './Login';`.
3. **Removed** `Auth/index.ts` and the now-empty **Auth/** directory (Git does not track empty dirs).
4. **Updated** **App.tsx** to use the lowercase path: `import { Login } from './components/auth';`.

**InvitationAcceptance** and **PasswordReset** already imported from `./auth/…`, so no change was needed there.

### 3.3 Resulting layout

Single directory:

- **auth/Login.tsx**
- **auth/index.ts** (exports Login)
- **auth/AccountSetupForm.tsx**, **InvitationSuccess.tsx**, **InvitationValidation.tsx**, **PasswordResetRequest.tsx**, **PasswordResetForm.tsx**

All imports now use the **lowercase** path `./components/auth` or `./auth/…`.

---

## 4. How to avoid this in the future

- **Use one casing for a path:** Don’t create both `Auth/` and `auth/`; pick one (we use **auth/**).
- **Prefer lowercase directories:** E.g. `auth`, `legal`, `admin` so you avoid accidental case-only differences.
- **Rename with Git:** Use `git mv` when changing path casing so history and other platforms stay consistent.
- **CI on multiple OSes (optional):** Running the build (or tests) on both Linux and macOS/Windows can catch case-sensitivity issues early.

---

## 5. Summary

| Before | After |
|--------|--------|
| Two dirs: **Auth/** and **auth/** (different only by case) | One dir: **auth/** with all auth components |
| App imported from `./components/Auth`; others from `./auth/…` | All imports use **auth** (lowercase) |
| Works on Linux; can break on macOS/Windows | Same behaviour on all platforms |

**Takeaway:** Avoid directories that differ only by case. Use a single, consistent casing (e.g. lowercase `auth/`) and merge or rename with `git mv` so the codebase is reliable on case-insensitive file systems.
