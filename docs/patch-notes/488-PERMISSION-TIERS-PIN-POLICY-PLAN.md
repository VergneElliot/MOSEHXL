# 488 — Basic vs specific permissions, and PIN policy (PLAN)

Slices C and E of [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md). Defines the two
access tiers that the whole permission system is built on, and makes 2-digit PINs safe.

## The two tiers

**Basic** — everything anybody on staff may do. Held implicitly by every active membership,
never granted, never revoked, compatible with a 2-digit PIN:

- Caisse: build a cart in comptoir mode or for a table, and validate it
- Checkout: **Paiement CB**, **Paiement espèces**, **Options de paiement**
- **Assigner à**: assigning the cart to a table (choosing *which* table)
- **Note** and **À suivre**
- **Plan de salle**: access, read-only in practice
- **Historique**: everything except cancelling a paid order
- **Paramètres → Profil** only

**Specific** — granted per account in « Gestion des utilisateurs », requires a 4–8 digit PIN:

- Caisse: Happy Hour manuel, Offert, Perso, waiter (re)assignment, intervening on another
  waiter's table
- Historique: cancelling / refunding a paid order
- Paramètres: every tab except Profil, plus menu management
- Bulletins de clôture: in full
- Administration: in full (documents, boîte mail, réservations, planning, utilisateurs,
  plans de salle)

Refinement continues page by page; the tier table is the single place to change.

## How a specific permission is exercised

Two paths, both must work:

1. The active PIN session holds the permission → the feature just works.
2. The active PIN session does **not** hold it → the button stays **visible and enabled**
   (never hidden, never greyed out). Clicking it asks for a PIN. A PIN belonging to an
   account that holds the permission authorizes the action; anything else is refused.

Consequence for the backend: authorization for a specific permission must accept the
**PIN identity** that answered the prompt, not only the logged-in account.

**Decision — how long a step-up lasts:** single action. Every click re-asks, which keeps the
strongest link between an action and the identity that authorized it. Entering a gated *page*
is the one exception: the PIN that opened it authorizes that page until it is left, because the
page's own reads and writes need the same rights.

**Which identity acts:** when a PIN session is open it is the acting identity, so its rights
govern and the account's own grants do not silently apply. With no session open, the
logged-in account acts for itself.

## PIN policy

Tier drives PIN length, so a specific permission can never be reachable with 2 digits:

| Account holds | PIN |
|---------------|-----|
| basic only | exactly 2 digits |
| any specific permission, or `establishment_admin` | 4–8 digits |

`ELEVATED_PIN_PERMISSIONS` is therefore **derived** from the specific tier rather than
hand-maintained, and granting a first specific permission to a 2-digit account must clear that
PIN and force a new one.

### Why 2 digits is acceptable, and what protects it

100 combinations is a small space, so it is only acceptable because a basic PIN unlocks
nothing damaging. Two controls back that up:

- **Tier invariant** — any grant that matters forces 4–8 digits.
- **Throttling and visibility** — PIN verify is identity-less (the pad sends digits only and
  the server scans every membership hash), so a wrong PIN matches nobody and there is no
  account whose failure counter could increase. Per-user lockout structurally cannot protect
  this endpoint; the control is a per-terminal throttle plus a security log on every failure.

## Permission registry consistency

- `access_compliance` had no database row since `2026_04_22_12_00_00_granular_permissions`
  renamed it to `access_closure`, while the code kept gating the legal journal on it. It must
  be re-seeded, and every registry key reconciled with the `permissions` table.
- `establishment_admin` holds every permission implicitly (decision recorded in 486), which
  removes the contradiction between `requirePermission` and
  `requireEstablishmentAdminOrPermission`.
- Grants whose name is no longer in the registry must be ignored rather than trusted.

## Verification

- [ ] Staff with no grants resolves to the basic tier only
- [ ] One specific grant flips the required PIN to 4–8 digits and clears an existing 2-digit PIN
- [ ] `establishment_admin` resolves to every key, including `access_compliance`
- [ ] Granting « Journal légal et conformité » actually opens the compliance API
- [ ] Repeated wrong PINs get throttled and logged as security events
- [ ] No tab or button is hidden or greyed out for lack of a permission
- [ ] A manager's PIN opens a gated page for a basic account, and the page's API calls work
- [ ] Leaving the page ends that authorization
- [ ] Fiscal impact: **PATCH** (no ISCA parameter change)

## Not in this slice

Per-feature refinement inside each page — which floor-plan actions, which settings, which
history operations are specific — continues page by page. `staff_pin_sessions` and the `sid`
claim (slice B) are still pending, so journal and order rows record the account and the PIN
user but not yet a session identifier.
