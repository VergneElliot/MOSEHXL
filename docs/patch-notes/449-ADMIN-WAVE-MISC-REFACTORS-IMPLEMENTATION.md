# 449 - Admin-Space Wave: Miscellaneous Refactors & Fixes - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Companion to: `443`–`448` (the feature notes for the same wave)

---

## 1) Context

Alongside the admin-space features, the same working period included a set of smaller
refactors and fixes that don't belong to any single feature. They are collected here so
nothing ships undocumented.

---

## 2) SystemAdmin data hooks extracted

The system-admin **Users** and **Security Logs** pages had data fetching, mutation, and
snackbar logic embedded in the page components. That logic moved into two new hooks:

| Hook | Wraps |
|---|---|
| `src/hooks/useSystemUsers.ts` | `GET /auth/system-users`, create via `/auth/register`, activate/deactivate |
| `src/hooks/useSystemSecurityLogs.ts` | `GET /auth/system-security-logs` + filters (severity filtered client-side) |

`SystemUsersPage`, `SystemUsersList`, `SystemUsersStats`, `SystemSecurityLogsPage`,
`SecurityLogsFilter/List/Stats`, and `SystemAdminLayout` became presentational (~86 lines
of duplicated fetching removed). Same pattern the POS/Menu/History sections already follow
(`useXxxAPI` hooks + dumb components).

---

## 3) Establishment business types canonicalized

`src/components/EstablishmentAccountCreation/businessTypes.ts` (new) defines the canonical
DB values — `restaurant`, `bar`, `cafe`, `retail`, `other` — with display labels, plus
`normalizeBusinessType()` for legacy free-form values ("Bistro", "Fast Food", …).
`BusinessInfoForm`/`BusinessInfoStep` now offer the canonical list, and `CompletionStep`
picks icons for `cafe`/`retail`. Prevents unbounded free-text values in
`establishments.business_type`.

---

## 4) Establishment deletion teardown hardened

`models/establishment.ts` delete path now explicitly clears the venue's rows from the
admin-space and fiscal tables (existence-checked so it works mid-migration), uses
`session_replication_role = replica` for the RESTRICT-protected fiscal tables, clears
`establishment_settings`/`closure_settings`, and logs failures with context.
`routes/enhancedEstablishments.ts` writes the `ESTABLISHMENT_DELETED` software event
**before** the hard delete, so the journal entry isn't destroyed by the delete itself
(test updated accordingly).

---

## 5) Platform-wide audit trail for system admins

`models/auditTrail.ts` adds `getPlatformAuditTrail` — a cross-tenant read (RLS bypass,
system-admin UI only) with filters and pagination capped at 200 rows per page.

---

## 6) Software event journal — new event types

`services/legal/softwareEventJournal.ts` registers `OPENING_HOURS_UPDATED` and
`CLOSURE_SETTINGS_UPDATED`, journaled by the settings PUT endpoints (notes 444/448).

---

## 7) POS grid stability tweaks

- `useGridColumnCount.ts`: 20 px width hysteresis so the appearance/disappearance of the
  scrollbar no longer causes column-count flapping (grid remount flicker).
- `ProductGrid.tsx`: column count and item min-height via CSS variables
  (`--pos-grid-cols`, `--pos-grid-item-min-height`), taller cards, stable Virtuoso item
  keys, `scrollbarGutter: stable` in `POSMenuPanel.tsx`.

---

## 8) Small fixes

| Where | What |
|---|---|
| `routes/establishmentAccountCreation/index.ts` | Failed completion now returns HTTP 400 instead of a success-shaped error |
| `Settings/types.ts`, `useSettings.ts` | Removed the never-wired "general"/"printer" settings stubs from state types |
| `.gitignore` | Removed boilerplate bare `public` pattern that was silently ignoring `MuseBar/backend/src/routes/public/` (see note 443 §6) |
| `.env.example` | Documents the new admin-space variables (`FRONTEND_URL`, `SPACES_*`, `INBOUND_EMAIL_WEBHOOK_TOKEN`) |

---

## 9) Rollback

All items are independent, additive, or pure refactors; revert per file if needed.
