# Multi-tenant model and Muse POS access

**Purpose:** How users are linked to establishments, how to log in to the Muse POS, and how to fix “lost” user–establishment links after profile/schema changes.

---

## 1. Two kinds of accounts

| Type | Who | `is_admin` | `role` | `establishment_id` | What they see after login |
|------|-----|------------|--------|--------------------|----------------------------|
| **System admin** | You (elliot.vergne@gmail.com) | `true` | `system_admin` | `null` | System Admin UI: establishments, system users, security logs. No POS. |
| **Establishment user** | Bar staff (e.g. elliotpokerpro, hugo) | `false` | `establishment_admin` or `cashier` | UUID of the establishment | Business UI: POS, Menu, History, Settings, etc. for that establishment only. |

- **System admin** is determined by `users.is_admin = true`. The login code then forces `role = 'system_admin'` and does not use `establishment_id` for routing. These users never see the POS; they see the System Admin interface.
- **Establishment users** must have `establishment_id` set to the establishment’s UUID (e.g. Muse). The backend uses this for every POS request (categories, products, orders are all filtered by `establishment_id`). So if `establishment_id` is `null`, the API returns 403 for categories/products and the POS cannot load.

So: **to use the Muse POS, you must log in with a user that has `establishment_id` = Muse’s UUID and `is_admin` = false.** Typically that user also has `role = 'establishment_admin'` so they see all tabs (including User Management and Audit Trail).

---

## 2. How login and POS data are wired

1. **Login**  
   - You send email + password to `POST /api/auth/login`.  
   - Backend looks up **one** user by email: `UserModel.findByEmail(email)`. If the same email exists in several rows (e.g. one per establishment), it picks the row that has `establishment_id` set (and then by `id DESC`).  
   - From that row it builds the JWT: `id`, `email`, `is_admin`, `role`, `establishment_id`.  
   - So the **same email** can in theory be used for different establishments by having multiple rows; the chosen row is the one with an establishment.

2. **After login**  
   - Frontend calls `GET /api/auth/me` and gets `role`, `establishment_id`, and `permissions`.  
   - If `role === 'system_admin'` → System Admin UI.  
   - Otherwise → Business UI (POS). Then it loads categories and products via the API.

3. **POS data (categories, products, orders)**  
   - Every request sends the JWT. Backend reads `req.user.establishment_id` from the JWT (it was set at login from the user row).  
   - Routes for categories, products, and orders all call something like `getEstablishmentId(req, res)`. If `establishment_id` is null, they return **403**.  
   - So the user row **must** have `establishment_id` set to the Muse UUID; otherwise the POS gets 403 and you see no data.

So “we lost the user attached to Muse” usually means: the **user row** for elliotpokerpro (or hugo) has `establishment_id` = `null` or wrong UUID, or the row was removed/duplicated so login picks the wrong one.

---

## 3. Muse establishment and contact email

- **Establishments** are in the `establishments` table: `id` (UUID), `name`, `email`, etc.  
- The **establishment email** (e.g. `muse.rouen@gmail.com`) is the contact email of the bar, stored on the establishment row. It does **not** by itself create a login user.  
- To log in to the Muse POS you need a **user** in the `users` table with:
  - `establishment_id` = Muse’s UUID  
  - `is_admin` = false  
  - `role` = `establishment_admin` (for full tabs) or `cashier` (limited by permissions)

So: **muse.rouen@gmail.com** may only exist as the establishment’s contact email. If there is no `users` row with that email and `establishment_id` = Muse, you cannot log in with it until you create that user (or attach an existing user to Muse).

---

## 4. How to fix Muse POS access (local DB)

Use the backend script that diagnoses and optionally fixes user–establishment links.

From the **backend** directory:

```bash
# 1. Diagnose: list establishments and users, and who can access Muse
npm run script:check-muse

# 2. Apply fix: set elliotpokerpro and hugo to Muse (establishment_admin and cashier)
npm run script:check-muse:fix
```

Or with npx:

```bash
cd MuseBar/backend
npx ts-node scripts/check-muse-access.ts           # diagnose
npx ts-node scripts/check-muse-access.ts --fix     # fix
```

The script:

- Lists all establishments and finds the one whose name contains “Muse”.
- Lists all users with their `role`, `establishment_id`, and `is_admin`.
- Shows who currently has `establishment_id` = Muse (and thus can access Muse POS).
- **Without `--fix`:** prints suggested `UPDATE` SQL so you can attach the right users to Muse.
- **With `--fix`:** runs the updates for `elliotpokerpro@gmail.com` (Muse admin) and `hugo.martins.76000@gmail.com` (Muse cashier).

After the fix, log in with **elliotpokerpro@gmail.com** (and his password). You should see the Business UI and Muse’s categories, products, and orders.

---

## 5. What the fix does (SQL)

Conceptually:

- For **elliotpokerpro@gmail.com**: set `establishment_id` to Muse’s UUID, `role = 'establishment_admin'`, `is_admin = false`.  
- For **hugo.martins.76000@gmail.com**: set `establishment_id` to Muse’s UUID, `role = 'cashier'`, `is_admin = false`.  

So:

- **elliot.vergne@gmail.com** is unchanged (stays system admin, no establishment).  
- **elliotpokerpro@gmail.com** becomes the Muse establishment admin and can use the full POS and user management for Muse.  
- **hugo.martins.76000@gmail.com** becomes a Muse cashier; you can then refine his permissions via the POS “Gestion utilisateurs” if needed.

---

## 6. If the script says “User not found”

Then there is no `users` row for that email. Options:

- **Create a user** for that email (e.g. via System Admin or an invite flow), then run the script again with `--fix` to attach them to Muse, or  
- Use another email that **does** exist in `users` and run the fix for that email (you can edit `scripts/check-muse-access.ts` to add more emails or change the `--fix` logic).

---

## 7. Deploying V2 on the cloud without losing data

- **Backup** the production DB before any migration.  
- Run the **same migrations** on production that you ran locally (so the schema matches, including `establishment_id`, `tips`, `change`, etc.).  
- Run the **same kind of user–establishment check** on the production DB (you can run the script against production by pointing `DB_*` in `.env` to the cloud DB, or run the equivalent SQL by hand).  
- Ensure the Muse establishment exists and that at least one user (e.g. elliotpokerpro) has `establishment_id` = Muse and `is_admin` = false so you can log in to the Muse POS in production.

The email/SendGrid and “create new establishment” flows are out of scope for this doc; the priority here is a working V2 cashier for Muse in line with French regulation and a clear way to get there from your current DB state.
