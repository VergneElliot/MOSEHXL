# Fix: package-lock in .gitignore (Audit #16) and Non-Existent Email Templates (Audit #17)

This doc explains **two** audit fixes: why `package-lock.json` must not be ignored (reproducible builds and CI), and why invitation email code was referencing templates that did not exist (runtime errors). We fix both so CI and invitation flows work reliably.

---

## Part A — package-lock.json in .gitignore (Audit #16)

### 1. What was the problem?

`package-lock.json` was listed in `.gitignore`. As a result:

- The lockfile was **never committed**, so the repo had no record of the exact dependency tree.
- **`npm ci`** (used in CI) **requires** a committed `package-lock.json`. Without it, `npm ci` fails and CI cannot install dependencies in a reproducible way.
- Different developers (or the same developer at different times) running **`npm install`** could get **different** versions of transitive dependencies, because npm would resolve versions at install time. That leads to **non-reproducible builds**: “works on my machine” and flaky CI.

So ignoring the lockfile broke CI and made builds non-reproducible.

### 2. Why the lockfile matters

- **`package.json`** declares *ranges* (e.g. `^1.2.3`). It does not pin the full tree.
- **`package-lock.json`** records the **exact** versions of every package (including nested dependencies) that were installed. Committing it means:
  - Everyone gets the **same** tree with `npm install` or `npm ci`.
  - **`npm ci`** can run in CI: it deletes `node_modules`, then installs strictly from the lockfile — fast and deterministic.

So the fix is: **stop ignoring** `package-lock.json` and **commit** the lockfiles for every `package.json` in the repo (e.g. `MuseBar/package.json` and `MuseBar/backend/package.json`).

### 3. What we changed

- **Removed** `package-lock.json` (and the “Package-lock files” comment) from **`.gitignore`**.
- **Generated** lockfiles where they were missing by running `npm install` in:
  - `MuseBar/`
  - `MuseBar/backend/`
- **Committed** those `package-lock.json` files so CI and future installs are reproducible.

### 4. How to verify

- Run **`npm ci`** in `MuseBar/backend` (and in `MuseBar/` if your CI uses it): it should succeed.
- Run **`npm run build`** (or your usual build) after `npm ci`: same dependency tree as when the lockfile was generated.

---

## Part B — Non-Existent Email Template References (Audit #17)

### 1. What was the problem?

`services/userInvitation/invitationEmail.ts` sends emails by template name via `emailService.sendTemplateEmail(templateName, ...)`. The **EmailTemplateManager** looks up the template by name and, if not found, **throws** (“Email template 'X' not found”). The code referenced four template names that were **never registered** in the built-in template registry:

| Template name used in code | Existed? |
|----------------------------|----------|
| `establishment_invitation` | No |
| `user_invitation` | Yes |
| `establishment_invitation_reminder` | No |
| `user_invitation_reminder` | No |
| `invitation_cancelled` | No |

So when a user triggered:

- **Establishment invitation** → `sendEstablishmentInvitationEmail` → `establishment_invitation` → **throw**.
- **User invitation reminder** or **Establishment invitation reminder** → `sendInvitationReminder` → `establishment_invitation_reminder` or `user_invitation_reminder` → **throw**.
- **Invitation cancelled** → `sendInvitationCancellationEmail` → `invitation_cancelled` → **throw**.

Only **user_invitation** (and unrelated templates like password reset) existed; the rest would throw at runtime.

### 2. Why this matters

- **Reliability:** Any flow that sends these emails (invite establishment, remind user/establishment, cancel invitation) would crash instead of sending mail.
- **Single source of truth:** Template IDs should be defined once (e.g. in `BuiltInTemplateId`) and implemented in the template registry. Callers (e.g. `invitationEmail.ts`) must only use IDs that are actually registered.

So the fix is: **define and register** the four missing templates so the names used in `invitationEmail.ts` exist in the built-in registry.

### 3. What we changed

- **Extended** `BuiltInTemplateId` in `services/email/templates/types.ts` with:
  - `ESTABLISHMENT_INVITATION = 'establishment_invitation'`
  - `USER_INVITATION_REMINDER = 'user_invitation_reminder'`
  - `ESTABLISHMENT_INVITATION_REMINDER = 'establishment_invitation_reminder'`
  - `INVITATION_CANCELLED = 'invitation_cancelled'`

- **Added** three new template modules (with the same pattern as existing ones):
  - **`establishmentInvitationTemplate.ts`** — Template for inviting an establishment to the platform (variables: `recipientName`, `establishmentName`, `inviterName`, `invitationUrl`, `expirationDate`).
  - **`invitationReminderTemplate.ts`** — Two templates sharing the same body pattern: **UserInvitationReminderTemplate** (`user_invitation_reminder`) and **EstablishmentInvitationReminderTemplate** (`establishment_invitation_reminder`) (same variables as above).
  - **`invitationCancelledTemplate.ts`** — Template for notification when an invitation is cancelled (variables: `recipientName`, `establishmentName`, `inviterName`, `role`).

- **Registered** all four in **`BuiltInTemplates.ts`** (in `getAllTemplates()`, `getTemplate()`, and `getTemplateIds()`).

No changes were required in **`invitationEmail.ts`**: it already used the correct template names; the missing piece was the template definitions and registration.

### 4. How to verify

- **Build:** `npm run build` in `MuseBar/backend` succeeds.
- **Runtime:** Trigger flows that send establishment invitation, user/establishment invitation reminder, and invitation cancellation; the app should send emails instead of throwing “template not found”.
- **Registry:** Call the email service’s “list templates” (or equivalent) and confirm `establishment_invitation`, `user_invitation_reminder`, `establishment_invitation_reminder`, and `invitation_cancelled` appear.

---

## 5. Takeaway

- **Lockfiles:** Do not put `package-lock.json` in `.gitignore`. Commit it (for each package root) so `npm ci` works in CI and installs are reproducible.
- **Templates:** Every template name passed to `sendTemplateEmail` must exist in the template manager. Add new template IDs and template modules, then register them in `BuiltInTemplates` so the invitation service (and any other caller) never hits a missing template at runtime.
