# Fix: Three Different Password Validation Rule Sets (#14)

This doc explains **why** having multiple password rules across flows was a problem, **what** the single canonical rule set is, and **how** we consolidated so every flow uses it.

---

## 1. What was wrong

The backend enforced password strength in **three (or more) different ways** depending on where the user set a password:

| Location | Rules |
|----------|--------|
| **setup/validator/validationRules.ts** | Length ≥ 8, one lowercase, one uppercase, one number, **one special character** (!@#$%^&* etc.) |
| **invitationValidator.ts** + **EstablishmentAccountService.ts** | Length ≥ 8, one uppercase, one lowercase, one number (no special char) |
| **UserAccountOperations.ts** (inline + validatePasswordStrength) | Inline: length ≥ 8 only. Strength: length 8–128, **“at least 3 of”** uppercase, lowercase, numbers, special |
| **routes/establishmentAccountCreation/index.ts** | Length &lt; 8 only (no complexity) |
| **middleware/validation.ts** (userCreate) | Length 8–128 only (no complexity) |

So:

- A user could **pass** invitation acceptance (upper + lower + number) and then **fail** setup (which required a special character).
- A user could **pass** the establishment account creation route (only “length ≥ 8”) and then **fail** the service’s private check (upper + lower + number).
- The “3 of 4” rule in UserAccountOperations was yet another policy: a password could be valid in one flow and invalid in another.

That’s confusing for users and fragile for maintainers: any change to “what’s a good password” had to be repeated in several places and kept in sync.

---

## 2. Why a single rule set matters

- **Consistency:** The same password is either valid or invalid everywhere (setup, invitation, account creation, user create). No “it worked here but not there.”
- **Single place to change:** Policy lives in one module; security or product can tighten or relax rules once.
- **Predictable UX:** One set of rules to show in the UI (e.g. “8–128 characters, at least one uppercase, one lowercase, one number”).

So the fix is: **one canonical rule set**, implemented in **one place**, and used by every flow that sets or validates a new password.

---

## 3. The canonical rule set

We chose a **single** rule set and implemented it in **utils/passwordValidation.ts**:

- **Min length:** 8  
- **Max length:** 128 (avoids DoS with huge inputs and aligns with common limits)  
- **At least one lowercase letter**  
- **At least one uppercase letter**  
- **At least one number**  

We did **not** require a special character, so setup, invitation acceptance, and account creation all share the same rule without making sign-up harder. If you later want to require special characters, you change only the shared module.

---

## 4. What we implemented

### 4.1 Shared module: **utils/passwordValidation.ts**

- **`validatePassword(password: string): { isValid: boolean; error?: string }`**  
  Returns the first failing rule as `error`, or `{ isValid: true }`. Use this for API responses and any single pass/fail check.

- **`getPasswordValidationErrors(password: string): { field: string; message: string }[]`**  
  Returns all failing rules (for setup wizards or forms that list every requirement).

- **Constants:** `PASSWORD_MIN_LENGTH = 8`, `PASSWORD_MAX_LENGTH = 128`.

### 4.2 Call sites refactored to use it

- **setup/validator/validationRules.ts** — `validatePassword()` now returns `getPasswordValidationErrors(password)` (as `SetupValidationError[]`). Setup no longer requires a special character; it uses the same rules as the rest of the app.
- **invitationValidator.ts** — `validatePassword()` calls the shared `validatePassword()` and maps the result to `InvitationValidationResult`.
- **EstablishmentAccountService.ts** — Private `validatePassword()` delegates to the shared `validatePassword()`.
- **routes/establishmentAccountCreation/index.ts** — Replaced the inline `password.length < 8` check with `validatePassword(password)` and returns `passwordValidation.error` on failure.
- **UserAccountOperations.ts** — Inline “length &lt; 8” replaced with shared `validatePassword()`. `validatePasswordStrength()` now uses the same rules: it calls `validatePassword()` and, if valid, computes an optional score for UX; the “3 of 4” rule was removed so the same passwords pass everywhere.
- **middleware/validation.ts** — `userCreate` password validator changed from `isValidString(val, 8, 128)` to `validatePassword(val).isValid`, with an updated French message describing the real rules.

So every path that validates a new password (setup, invitation acceptance, establishment account creation, user creation via common validations, and account-creation service/database layer) now uses the same rules from **utils/passwordValidation.ts**.

---

## 5. Teaching: one policy, one implementation

When the same business rule is used in multiple places (e.g. “what’s a valid password”):

1. **Define the rule once** — e.g. min/max length and character classes — and document it (e.g. in a doc or JSDoc).
2. **Implement it once** — in a small, stateless module (e.g. `utils/passwordValidation.ts`) that exposes a function other code can call.
3. **Refactor every caller** to use that function instead of reimplementing or copying the logic. Callers can still map the result to their own types (e.g. `SetupValidationError[]`, or a single API error message).
4. **Avoid “almost the same” variants** — e.g. “3 of 4” in one place and “all of upper, lower, number” in another. One policy everywhere avoids inconsistent UX and security.

Result: a user who chooses a password that passes the shared rules will pass in every flow (setup, invitation, account creation, user create); and a future change to the rules is done in one file.

---

## 6. Summary

| Before | After |
|--------|--------|
| Setup: 8 + upper + lower + number + **special** | All flows: 8–128 + upper + lower + number (no special required) |
| Account creation route: length &lt; 8 only | Same shared rule |
| InvitationValidator / EstablishmentAccountService: 8 + upper + lower + number | Same shared rule |
| UserAccountOperations: length only or “3 of 4” | Same shared rule |
| middleware userCreate: length 8–128 only | Same shared rule |

**Single source of truth:** `utils/passwordValidation.ts` — `validatePassword()` and `getPasswordValidationErrors()`.
