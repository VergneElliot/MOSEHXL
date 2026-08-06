# 443 - Admin Space Foundation: Documents, Inbox & Object Storage - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Runbook: `docs/runbooks/ADMIN-SPACE-INBOUND-AND-STORAGE.md` (operational setup)  
Related notes: `444` (Reservations), `445` (Planning), `446` (Time Clock), `447` (Memberships)

---

## 1) Context — what is the "Admin Space"?

Until now, the app had two worlds: the **POS** (cashiers ring up orders) and **Settings/Legal**
(admins configure the venue and handle compliance). What was missing was a place for the
*day-to-day office work* of running a bar or restaurant: keeping licences and contracts in one
place, receiving email from suppliers and guests, taking reservations, planning staff shifts,
and tracking who clocked in.

This patch introduces the **Administration** tab — a new top-level section of the app, visible
to establishment admins (and to staff who are granted specific permissions). It groups seven
panels: **Documents**, **Boîte mail** (inbox), **Réservations**, **Planning**, **Pointage**
(time clock), **Utilisateurs**, and **Journal de sécurité** (the last two moved here from
their old standalone tabs).

This note covers the shared foundation plus the Documents and Inbox features. Reservations,
Planning, Time Clock, and multi-establishment memberships have their own notes (444–447).

---

## 2) Database — migration `2026_07_30_15_00_00_establishment_admin_space.sql`

One migration lays the foundation for the whole admin space:

### New permissions (seeded into `permissions`)

| Permission | Gates |
|---|---|
| `access_documents` | Documents panel + `/api/admin/documents` |
| `access_inbox` | Inbox panel + `/api/admin/inbox` |
| `access_reservations` | Reservations panel + `/api/admin/reservations` |
| `access_planning` | Planning panel + `/api/admin/planning` (and time-entry admin) |

Every existing `establishment_admin` user is automatically granted all four, so admins see
the new tab immediately after migrating. Staff get nothing by default — an admin must grant
permissions explicitly. The shared TypeScript constants in `MuseBar/packages/types` were
extended with the same four keys.

### New columns on `establishments`

| Column | Purpose |
|---|---|
| `slug` (`VARCHAR(64)`) | The local part of the venue's email address `slug@mosehxl.com` |
| `admin_inbox_autoforward` (`BOOLEAN`, default `TRUE`) | Forward a copy of inbound mail to the venue's contact email |
| `reservations_ics_token` (`UUID`) | Secret token for the public reservations calendar feed |
| `planning_ics_token` (`UUID`) | Establishment-level planning calendar feed token |

**Slug rules:** lowercase letters and digits only, must start with a letter
(`^[a-z][a-z0-9]{0,63}$`, enforced by a DB CHECK plus a unique partial index). The migration
backfills slugs from establishment names (accents stripped, non-alphanumerics removed,
duplicates disambiguated with a numeric suffix, empty names fall back to `etab`). New
establishments get a slug at creation time via `utils/establishmentSlug.ts` +
`EstablishmentDataProcessor.allocateUniqueSlug` (tries `name`, then `name2`, `name3`, …).

### New tables

| Table | What it stores |
|---|---|
| `admin_documents` | Document library: `title`, `category`, `tags TEXT[]`, `storage_key` (pointer into object storage), `file_name`, `mime_type`, `size_bytes`, optional `expires_at` date, `source` (`manual` \| `email`), soft-delete via `deleted_at` |
| `admin_document_expiry_reminders` | Dedupe table so each expiry warning email is sent once per document per offset (`UNIQUE (document_id, days_before)`) |
| `inbox_messages` | Inbound emails: `message_id` header, `from_address`, `to_address`, `subject`, `text_body`, sanitized `html_body`, `received_at`, `is_read`, `is_archived` |
| `inbox_attachments` | Attachment metadata + `storage_key`; `imported_document_id` links to `admin_documents` once imported |
| `reservations`, `staff_shifts`, `staff_planning_ics_tokens` | Created here too — documented in notes 444/445 |

All new tables get **row-level security** (`ENABLE` + `FORCE`) with the standard tenant
policies (`app_current_establishment_id()` / `app_rls_bypass()`), same as the rest of the
shared-table multi-tenant model.

A follow-up migration `2026_08_05_18_30_00_inbox_message_id_text.sql` widens
`inbox_messages.message_id` from `VARCHAR(255)` to `TEXT`: real-world Gmail Message-IDs and
folded headers can exceed 255 characters and were breaking inserts. The handler caps the
stored value at 998 characters.

---

## 3) Object storage (DigitalOcean Spaces)

Files (documents, email attachments) are **not** stored in PostgreSQL — they go to an
S3-compatible bucket. New service: `services/storage/objectStorage.ts`.

- **Env vars:** `SPACES_ENDPOINT`, `SPACES_REGION` (default `fra1`), `SPACES_BUCKET`,
  `SPACES_KEY`, `SPACES_SECRET`. All documented in `.env.example`.
- **Client:** `@aws-sdk/client-s3` (new dependency, plus `@aws-sdk/s3-request-presigner`
  and `multer` for multipart uploads).
- **Key namespacing:** `establishments/<uuid>/documents|inbox/<uuid>-<sanitized-filename>`
  — one folder per tenant, so venues can never collide.
- **Downloads:** presigned URLs valid for 300 seconds; objects themselves are private.
- **Graceful degradation:** if storage env vars are missing, document upload/download
  returns **503 `OBJECT_STORAGE_NOT_CONFIGURED`**, inbound email still stores the message
  but skips attachments (with a warning log), and the UI shows a "storage not configured"
  banner. There is no local-disk fallback.

---

## 4) API surface

Everything mounts under `/api/admin` (`routes/admin/index.ts`), guarded by `requireAuth`
plus a new helper `requireEstablishmentAdminOrPermission(perm)` — establishment admins
always pass, other users need the named venue-scoped permission.

### Documents (`routes/admin/documents.ts`, gate: `access_documents`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/documents/categories` | List of the 8 fixed categories |
| GET | `/api/admin/documents` | List (filters `?category`, `?q`); includes `storageConfigured` flag |
| POST | `/api/admin/documents` | Multipart upload (25 MB cap): file + title/category/tags/expires_at |
| PATCH | `/api/admin/documents/:id` | Update metadata |
| GET | `/api/admin/documents/:id/download-url` | Presigned URL (300 s) |
| DELETE | `/api/admin/documents/:id` | Soft delete (`deleted_at`) |

Categories are a fixed list in `services/admin/documentCategories.ts`: `licences`,
`droits_exploitation`, `droits_terrasse`, `contrats_employes`, `assurances`,
`hygiene_haccp`, `fiscal`, `autre` (unknown values are coerced to `autre`).

### Inbox (`routes/admin/inbox.ts`, gate: `access_inbox`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/inbox` | List messages (`?archived`, `?limit`, `?offset`) + the venue's `inbox_address` |
| GET | `/api/admin/inbox/settings` / PUT | Read / set the autoforward toggle |
| GET | `/api/admin/inbox/:id` | Message detail + attachments; marks as read; links reservation info when relevant |
| POST | `/api/admin/inbox/:id/archive` | Archive / unarchive |
| POST | `/api/admin/inbox/:id/reply` | Reply — sent From/Reply-To `slug@mosehxl.com` |
| POST | `/api/admin/inbox/attachments/:attachmentId/import` | Turn an attachment into an `admin_documents` row (`source: 'email'`, reuses the same storage object) |
| GET | `/api/admin/inbox/attachments/:attachmentId/download-url` | Presigned download |

### Email diagnostics (`routes/admin/emailStatus.ts`, establishment admin only)

`GET /api/admin/email-status` reports whether SendGrid is configured, which `FROM_EMAIL` is
active, whether the inbound webhook token is set, and whether object storage is configured —
a one-stop health check used during deployment (see the runbook's smoke test).

---

## 5) Inbound email — how mail reaches the app

Each venue now has a real email address: `slug@mosehxl.com`. The flow:

1. An MX record points `mosehxl.com` at SendGrid **Inbound Parse**.
2. SendGrid POSTs each incoming mail (multipart form: `to`, `from`, `subject`, `text`,
   `html`, attachments) to `POST /api/inbound-email/:token`.
3. The `:token` path segment must equal env `INBOUND_EMAIL_WEBHOOK_TOKEN` (a long random
   secret) — this is the only authentication on the webhook; mismatch → 401.
4. The handler extracts the slug from the `to`/`envelope` address. Unknown slug → responds
   `200 { ignored: true }` so SendGrid doesn't retry forever.
5. Message stored in `inbox_messages` (HTML sanitized: scripts, styles, and `on*` handlers
   stripped); attachments uploaded to Spaces (25 MB/file, 20 files max).
6. If `admin_inbox_autoforward` is on and the venue has a contact email, a summary copy is
   forwarded there (failure logged, webhook still returns 200).

Replies from the inbox UI are sent through the normal `EmailService`, with the venue's slug
address as From/Reply-To — so guests see a consistent address.

---

## 6) Frontend

New component family under `MuseBar/src/components/Administration/`:

| Component | Role |
|---|---|
| `AdministrationContainer.tsx` | Sub-tab shell; shows only panels the user may access |
| `DocumentsPanel.tsx` | Search + category filter, upload dialog, expiry chips (orange ≤ 30 days, red ≤ 7), download/edit/archive |
| `InboxPanel.tsx` | Message list + detail, reply, archive, import-attachment-to-Documents, autoforward switch |
| `AdminMonthCalendar.tsx` | Shared month-calendar widget used by Reservations and Planning |
| `index.ts` | Barrel export |

API client wrappers live in `MuseBar/src/services/api/adminSpace.ts`.

`AppRouter.tsx` replaces the old standalone "Gestion utilisateurs" and "Journal de Sécurité"
tabs with the single **Administration** tab (visible to establishment admins, venue-bound
users, or anyone holding one of the admin-space permissions). `appLazyTabPanels.tsx`
lazy-loads the container so the POS bundle stays lean.

### Note: `.gitignore` fix

The repo's `.gitignore` contained a boilerplate bare `public` pattern (from a Gatsby
template) which silently ignored the new `MuseBar/backend/src/routes/public/` directory —
the public reservation/planning/ICS routes wired into `app.ts`. That line was removed as
part of this documentation pass so the files actually ship. `MuseBar/public/` is empty, so
nothing else changed.

---

## 7) Server lifecycle

`app.ts` mounts `/api/admin` and `/api/inbound-email`, and starts a new
`DocumentExpiryScheduler` (`utils/documentExpiryScheduler.ts`) on listen: every hour it
looks for documents expiring in exactly **30, 7, or 1** days, emails the venue's contact
address a summary, and records the send in `admin_document_expiry_reminders` so warnings
never repeat.

---

## 8) Rollback

Migration has a DOWN section; the feature is additive (no existing tables altered besides
new `establishments` columns). Reverting the code commit and rolling back the migrations
restores the previous state. Objects already uploaded to Spaces are left in place.
