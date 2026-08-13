# 456 — Floor service + soft badge PIN — Phase A Implementation

Date: 2026-08-13  
Plan: `docs/patch-notes/455-FLOOR-SERVICE-SOFT-BADGE-PIN-PLAN.md`  
Branch: `development`

---

## 1) What shipped

Phase A foundations only (API + schema). No POS map UI yet; **Sélectionner une table** stub unchanged until Phase B.

| Area | Deliverable |
|------|-------------|
| Migration | `2026_08_13_22_00_00_floor_service_and_membership_pin.sql` |
| Soft badge | PIN on `user_establishment_memberships`; verify → pin-actor JWT |
| Floor | `floor_plans`, `dining_tables` CRUD |
| Tickets | `open_tickets` / `open_ticket_items` (options as JSONB) |
| Permission | `manage_floor_plan` (+ grant to existing establishment_admins) |

---

## 2) Identity (as planned)

- **Station JWT** — device session (unchanged).
- **PIN** — membership-scoped, **6 digits**, bcrypt, manager-set via `access_user_management`.
- **Pin-actor token** — `token_use: pin_actor`, 8h TTL, header `X-Pin-Actor-Token`.
- Permissions remain on the **user profile**; pin-actor carries effective permission list for authorize-mode later.

---

## 3) API

| Method | Path | Gate |
|--------|------|------|
| `POST` | `/api/auth/pin/verify` | station auth |
| `POST` | `/api/auth/pin/set` | `access_user_management` |
| `DELETE` | `/api/auth/pin/:userId` | `access_user_management` |
| `GET` | `/api/auth/pin/status/:userId` | `access_user_management` |
| `GET/POST/PATCH/DELETE` | `/api/floor/plans…` | read: `access_pos`; write: `manage_floor_plan` |
| `GET/POST/PATCH/DELETE` | `/api/floor/tables…` | same |
| `GET` | `/api/floor/status` | `access_pos` (tables + open ticket summary) |
| `POST` | `/api/floor/tickets` | pin actor + `access_pos` |
| `GET` | `/api/floor/tickets/:id` | `access_pos` |
| `PUT` | `/api/floor/tickets/:id/items` | pin actor |
| `POST` | `/api/floor/tickets/:id/abandon` | pin actor |
| `POST` | `/api/floor/tickets/:id/close` | pin actor + `order_id` (Phase B payment hook) |

One **open** ticket per table (partial unique index).

---

## 4) Key files

- `MuseBar/backend/src/models/membershipPin.ts`
- `MuseBar/backend/src/services/auth/pinActorToken.ts`
- `MuseBar/backend/src/middleware/pinActor.ts`
- `MuseBar/backend/src/routes/authPin.ts`
- `MuseBar/backend/src/routes/floor.ts`
- `MuseBar/backend/src/models/database/floorModel.ts`
- `MuseBar/backend/src/models/database/openTicketModel.ts`
- `@mosehxl/types` — `PERMISSIONS.manage_floor_plan`

---

## 5) Tests

- `pinActorToken.test.ts` — sign/verify, reject station JWT, PIN format
- `floor.routes.test.ts` — list plans, open ticket, conflict on occupied table

---

## 6) Explicitly not in this commit

- POS badge strip / map modal / cart binding (Phase B)
- Migrating cancel/menu gates from JWT → PIN authorize
- Transfer / merge / À suivre / waiter reports
- Per-user lockout on anonymous wrong PIN (rate-limit later; columns exist for attributed lockout)

---

## 7) Ops

```bash
cd MuseBar/backend && npm run migration:migrate
```

Apply on development DBs only until Phase B is ready for `main`.
