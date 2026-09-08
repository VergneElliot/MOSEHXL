# MOSEHXL — Agent Guide

French hospitality POS (MuseBar) in advanced pre-certification for Article 286-I-3 bis CGI fiscal compliance. Multi-tenant SaaS: shared PostgreSQL schema, row isolation via `establishment_id` + RLS.

## Stack

| Layer | Path | Tech |
|-------|------|------|
| Frontend | `MuseBar/src` | React 18, TypeScript, MUI, Vite |
| Backend | `MuseBar/backend/src` | Express, TypeScript, raw `pg` |
| Shared types | `MuseBar/packages/types` | `@mosehxl/types` |
| Print bridge | `MuseBar/bridge` | Node ESC/POS LAN bridge |

## Commands (from repo root)

```bash
npm install
npm run dev:backend          # API :3001
npm run dev                  # Frontend :3000 (proxies /api)

npm run build
npm run check:module-size # 400-line cap, ratcheted against scripts/module-size-baseline.json
npm test --workspace MuseBar/backend
npm test --workspace MuseBar
npm run lint --workspace MuseBar/backend
npm run type-check --workspace MuseBar

cd MuseBar/backend && npm run migration:status
npm run docs:patch-notes-index
```

## Branch model

- **`development`** — all feature and fix work
- **`main`** — production (mosehxl.com); merge via PR only

Live status: [docs/CURRENT-TRUTH.md](docs/CURRENT-TRUTH.md), [DEVELOPMENT-STATE.md](DEVELOPMENT-STATE.md), [docs/patch-notes/LATEST-INDEX.md](docs/patch-notes/LATEST-INDEX.md).

## Never break these rules

1. **Legal journal is append-only** — never UPDATE/DELETE/TRUNCATE `legal_journal`; reversals = new REFUND/CHANGE entries. Order creation aborts if journal write fails.
2. **Tenant scope always** — pass `establishment_id` from `getEstablishmentId(req)`; never trust client-supplied tenant IDs.
3. **Never edit applied migrations** — create a new migration; checksum verification blocks edits.
4. **Backend auth is mandatory** — frontend permission UI is UX only; every mutating route needs `requireAuth` + permission/PIN gates.
5. **Parameterized SQL only** — `$1`, `$2`; whitelist dynamic column names via allowlists.
6. **No monolithic files** — one file per component or concern, **400 lines max** (target ≤ 250). A new responsibility means a new file, whatever the current size. Never add code to a file listed in `scripts/module-size-baseline.json`; put it in a new module. Enforced by `npm run check:module-size` in pre-commit and CI. Details: `.cursor/skills/code-hygiene/SKILL.md`.

## Permission tiers

Two tiers, defined by `PERMISSION_TIERS` in `@mosehxl/types` — the single source of truth for
grantable checkboxes, PIN length and step-up gating.

- **Basic** — held implicitly by every active membership, never granted, 2-digit PIN allowed.
- **Specific** — granted per account in « Gestion des utilisateurs », requires a 4–8 digit PIN.

When a feature is called a **specific permission**, all three follow:

1. a key in `PERMISSIONS` classified `specific` in `PERMISSION_TIERS`;
2. the feature stays **visible and enabled** — access comes from a PIN session holding the
   right, or from a one-shot PIN prompt (`ensurePermission` / `ensureAccess`) answered by a PIN
   whose account holds it;
3. a checkbox in « Gestion des utilisateurs », labelled and grouped in `src/types/auth.ts`.

Anything not called out as specific is basic: available to every account.

## Project skills

Domain skills live in `.cursor/skills/`. Read the relevant skill before touching that area:

| Skill | When to use |
|-------|-------------|
| `code-hygiene` | Before adding to an existing file, when one nears 400 lines, or when the module size check fails |
| `legal-journal-compliance` | Journal, closures, archives, invoices, business-day logic |
| `auth-and-multi-tenancy` | JWT, PIN sessions, permissions, RLS, memberships |
| `database-migrations` | Schema changes, migration CLI, drift policy |
| `patch-notes-workflow` | New features, audits, CHANGELOG, patch-note numbering |
| `backend-api-route` | New or changed Express routes |
| `frontend-feature` | React containers, hooks, ApiService |
| `pos-and-floor-service` | POS cart, floor plan, open tickets, kitchen |
| `administration-space` | Documents, inbox, reservations, planning, admin floor editor |
| `printing-and-receipts` | Receipts, kitchen printers, print bridge |
| `testing-and-ci` | Vitest, CI jobs, real-db tests |

## Key patterns

- **Backend route:** `requireAuth` → `getEstablishmentId` → service → model → `asyncHandler` + `AppError`
- **Frontend feature:** `*Container` + `useXState` / `useXLogic` / `useXAPI`
- **Shared constants:** `@mosehxl/types` (`PERMISSIONS`, `pinRules`, etc.)
