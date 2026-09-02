---
name: administration-space
description: >-
  Establishment Administration space for MOSEHXL/MuseBar: documents, inbox,
  reservations, staff planning, time clock, floor plan editor, users, compliance,
  audit. Use when modifying Administration tab, admin API routes, SendGrid inbox,
  DO Spaces storage, public reservations, or staff shifts.
---

# Administration Space

Establishment-facing **Administration** tab (not System Admin). Gated by permissions; sub-tabs filtered in `AdministrationContainer`.

## UI entry

- Top-level tab: **Administration** (`AppRouter` value `administration`)
- Container: `MuseBar/src/components/Administration/AdministrationContainer.tsx`
- Step-up PIN may be required on tab entry (`AppRouter` + `StepUpAuthContext`)

## Sub-sections and permissions

| Sub-tab (FR) | Key | Permission / gate | Panel |
|--------------|-----|-------------------|-------|
| Documents | `documents` | `access_documents` or est. admin | `DocumentsPanel.tsx` |
| Boîte mail | `inbox` | `access_inbox` | `InboxPanel.tsx` |
| Réservations | `reservations` | `access_reservations` | `ReservationsPanel.tsx` |
| Planning | `planning` | `access_planning` | `PlanningPanel.tsx` |
| Pointage | `time_clock` | any establishment member | `TimeClockPanel.tsx` |
| Plans de tables | `floor` | `manage_floor_plan` | `FloorPlansPanel.tsx` |
| Utilisateurs | `users` | `access_user_management` | lazy `UserManagement` |
| Conformité Légale | `compliance` | establishment_admin only | lazy `LegalComplianceDashboard` |
| Journal de sécurité | `audit` | establishment_admin only | lazy `AuditTrailDashboard` |

**Do not confuse** with top-level **Plan de salle** tab — that is operational floor service during POS (`pos-and-floor-service` skill). **Plans de tables** here is the **layout editor** (create/move/resize tables on canvas).

## Backend

Mounted at `/api/admin` in `app.ts`:

```
routes/admin/index.ts
  ├── /documents     → documents.ts (+ DO Spaces via services/storage)
  ├── /inbox         → inbox.ts (SendGrid inbound parse webhook + UI reads)
  ├── /reservations  → reservations.ts (+ public booking routes under /api/public)
  ├── /planning      → planning.ts (shifts, recurrence, ICS tokens)
  ├── /leaves        → leaves.ts (congés, balances, approval)
  ├── /email-status  → emailStatus.ts (SendGrid health for admin UI)
  └── /time-clock    → timeClock.ts (IP-restricted punch in/out)
```

Floor plan CRUD for the editor uses **`/api/floor`** (same as POS floor), not `/api/admin/floor`.

## Frontend API client

`MuseBar/src/services/api/adminSpace.ts` — documents, inbox, reservations, planning, time clock helpers.

Floor editor uses `services/api/floor.ts` directly from `FloorPlansPanel.tsx`.

Shared canvas: `components/floor/FloorCanvasView.tsx`, `floorGeometry.ts`.

## External dependencies

| Feature | Service | Runbook |
|---------|---------|---------|
| Document uploads | DigitalOcean Spaces | `docs/runbooks/ADMIN-SPACE-INBOUND-AND-STORAGE.md` §1 |
| Inbound mail `slug@mosehxl.com` | SendGrid Inbound Parse | same runbook §2 |
| Outbound mail (reservations, etc.) | SendGrid domain auth | same runbook §0 |
| Multi-venue switching | memberships | `docs/runbooks/MULTI-ESTABLISHMENT-MEMBERSHIPS.md` |

Env keys: `SPACES_*`, `SENDGRID_API_KEY`, `FROM_EMAIL`, `PUBLIC_API_URL`.

## Patterns

- Every admin route: `requireAuth` + `getEstablishmentId` + permission middleware
- Tenant scope on all queries; RLS via pool wrapper
- File uploads: multipart to backend → Spaces with key `establishments/<uuid>/...`
- Public reservation pages: `components/Public/` + `routes/public/`

## When extending Administration

1. Add permission to `@mosehxl/types` `PERMISSIONS` if new sub-area
2. Register sub-tab in `AdministrationContainer` with permission filter
3. Add route under `routes/admin/` and mount in `admin/index.ts`
4. Add client functions to `adminSpace.ts`
5. Patch note PLAN + IMPLEMENTATION; update runbook if new env vars

## Related skills

- `pos-and-floor-service` — **Plan de salle** tab (runtime table service), not this editor
- `auth-and-multi-tenancy` — permissions, memberships
- `legal-journal-compliance` — compliance dashboard sub-tab
- `backend-api-route` — new admin endpoints
- `frontend-feature` — panel/hook structure

## Docs

- `docs/runbooks/ADMIN-SPACE-INBOUND-AND-STORAGE.md`
- Patch notes `443`–`449` (admin space wave)
- `DEVELOPMENT-STATE.md` — Admin Space update (Aug 2026)

## Refinement status (living)

Track major polish passes here when completing an area:

| Area | Status |
|------|--------|
| Documents | baseline shipped |
| Inbox | baseline shipped |
| Réservations | baseline shipped |
| Planning | baseline + congés slice A |
| Pointage | UI tabs + compliance report (slice A) |
| Plans de tables (editor) | **active — major work expected** |
| Users / Compliance / Audit | embedded from legacy tabs |
