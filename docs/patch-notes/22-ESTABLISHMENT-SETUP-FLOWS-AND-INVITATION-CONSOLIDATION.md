# Fix: Establishment/Setup Flows (#12) and Invitation Validation (#13)

This doc explains **why** having five overlapping establishment/setup flows and five duplicate invitation queries was a problem, **what** we changed (single shared invitation query), and **how** the flows relate so you can evolve toward one canonical path later.

---

## 1. The two audit findings

### 1.1 #12 — Five overlapping establishment/setup flows

Five different code paths create or complete establishments and their setup:

| Entry point | Service / orchestrator | Purpose |
|-------------|------------------------|--------|
| **routes/establishments.ts** | EstablishmentService | “Old” flow: POST/GET/DELETE establishments (system admin). Creates establishment + schema, no invitation. |
| **routes/enhancedEstablishments.ts** | EstablishmentCreationOrchestrator | “New” flow: POST create establishment with enhanced workflow; GET stats. |
| **routes/establishmentAccountCreation/** | AccountCreationOrchestrator (via EstablishmentAccountService) | Token-based flow: validate invitation, complete account with password and business info. |
| **routes/setup.ts** | SetupService | Wizard-style: validate token, check status, complete business setup (name, contact, address, user). |
| **services/userInvitation/invitationAcceptance.ts** | InvitationAcceptance | Accept establishment or user invitation (create establishment or user from invitation). |

They overlap in intent (create or complete an establishment / user from an invitation) but differ in API shape, validation, and which service does what. That makes it unclear which path to use and duplicates logic (e.g. “is this invitation valid?”).

### 1.2 #13 — Five parallel invitation validation implementations

The same logical check — **fetch a pending, non-expired invitation by token** — was implemented in five places with the same (or very similar) SQL:

- `EstablishmentInvitationManager.ts` — `WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW()`
- `EstablishmentAccountService.ts` — same with JOIN establishments
- `InvitationOperations.ts` (establishmentAccountCreation) — by token then status/expiry in code; setup/invitationOperations had pending but no `expires_at` in WHERE
- `invitationValidator.ts` — same WHERE with pool
- `middleware/validateInvitation.ts` — same with JOIN establishments

So the **same query** (and same business rule: pending + not expired) lived in five places. Any change to the rule or to the selected columns had to be repeated everywhere, and it was easy for one place to drift (e.g. omitting `expires_at`).

---

## 2. Why this matters

- **Single source of truth:** “Get pending invitation by token” should be implemented once. Then every flow (setup, account creation, acceptance) uses that result and applies its own next steps (e.g. check establishment status, complete setup).
- **Consistency:** All flows should see the same definition of “valid invitation” (same columns, same JOINs if needed). That’s only possible if one module runs the query.
- **Maintainability:** Changing the rule (e.g. add a column, or a new status) is done in one place instead of five.
- **Clarity:** For #12, having one documented “canonical” flow (and optionally deprecating others) reduces confusion. We didn’t merge the five flows in this change, but we removed the duplicated invitation logic they shared.

---

## 3. What we changed (#13 — invitation consolidation)

We made **InvitationQueries.getInvitationByToken** in **utils/database/sharedQueries.ts** the single place that runs the “pending, non-expired invitation by token” query.

- **Query (single place):**  
  `SELECT ui.*, e.id AS establishment_id, e.name AS establishment_name, e.email AS establishment_email, e.status AS establishment_status FROM user_invitations ui LEFT JOIN establishments e ON ui.establishment_id = e.id WHERE ui.invitation_token = $1 AND ui.status = 'pending' AND ui.expires_at > CURRENT_TIMESTAMP`

- **Signature:**  
  `InvitationQueries.getInvitationByToken(client: PoolClient | Pool, token: string)`  
  Returns the single row or `null`. Callers that need a Pool use the shared pool; callers in a transaction pass their `client`.

All former duplicate implementations now call this:

- **EstablishmentInvitationManager** — `validateInvitationToken(client, token)` uses `InvitationQueries.getInvitationByToken(client, token)`.
- **EstablishmentAccountService** — `validateInvitationToken(client, token)` uses it; same post-checks (establishment_id, establishment_status).
- **invitationValidator** (userInvitation) — `validateInvitationToken(token)` uses `InvitationQueries.getInvitationByToken(pool, token)`.
- **middleware/validateInvitation** — `validateInvitationToken(client, token)` uses it; same response shape (establishment id, name, email, status).
- **setupValidator** — invitation check uses `InvitationQueries.getInvitationByToken(client, invitationToken)`.
- **setup/invitationOperations** — `validateInvitationForSetup(client, token)` uses it (and now also enforces `expires_at` in the query).
- **invitationAcceptance** — `acceptEstablishmentInvitation`, `acceptUserInvitation`, and `getInvitationDetails` use it (with client or pool as appropriate).
- **invitationCreator** — `getInvitationByToken(token)` uses `InvitationQueries.getInvitationByToken(pool, token)`.

So the **same query and rule** live in one module; every flow that needs “valid invitation by token” goes through it.

---

## 4. What we didn’t change (#12 — flow consolidation)

We did **not** merge the five establishment/setup flows into one route or one service. That would require:

- Choosing one canonical API (e.g. token-based account creation vs wizard vs invitation-acceptance).
- Migrating callers (e.g. frontends) to that API.
- Deprecating or removing the other routes and their services.

So for #12 we only:

- **Document** the five entry points and their roles (see table above).
- **Remove** the duplicated invitation logic they shared (#13), so at least “valid invitation” is consistent and maintained in one place.

A future step can be to pick one canonical flow (e.g. establishment account creation or setup wizard) and deprecate or redirect the others, with the doc and this consolidation as a base.

---

## 5. Teaching: single source of truth for shared queries

When the same SQL (and same business rule) appears in several files:

1. **Identify the canonical rule** — e.g. “pending invitation by token, not expired, with optional establishment info.”
2. **Put it in one module** — e.g. a shared query layer (`utils/database`, `InvitationQueries`) that takes a DB client (or pool) and parameters.
3. **Refactor call sites** to call that function and then do their own logic (e.g. check establishment status, build response shape). They no longer own the query text.
4. **Document** the function (JSDoc) so everyone knows it’s the single place for that rule.

That way, a change to the rule (e.g. add a column, or “pending” plus another status) is done once, and all flows benefit.

---

## 6. Summary

| Item | Change |
|------|--------|
| **#13 Invitation query** | Single implementation: `InvitationQueries.getInvitationByToken` in `utils/database/sharedQueries.ts`. All 5 (plus 3 more) call sites refactored to use it. Query includes `establishment_status` where needed. |
| **#12 Flows** | Documented the five establishment/setup entry points; no structural merge yet. Shared invitation logic removed so flows at least agree on “valid invitation.” |

Result: one place defines “pending, non-expired invitation by token”; every flow that needs it uses that. Future work can consolidate the five flows into one canonical path if desired.
