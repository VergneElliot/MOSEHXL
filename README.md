# MOSEHXL — MuseBar POS System

A point-of-sale and bar management system built for French hospitality businesses, with full legal compliance for French fiscal law (Article 286-I-3 bis du CGI).

## Project Structure

```
MOSEHXL/
├── MuseBar/
│   ├── backend/          # Node.js / Express / TypeScript API (port 3001)
│   │   └── src/
│   │       ├── config/       # Environment validation, timezone
│   │       ├── middleware/    # Auth (JWT), validation, security stack
│   │       ├── models/       # DB models, SQL schemas, legal journal
│   │       ├── routes/       # Express route handlers (orders/, legal/, etc.)
│   │       ├── services/     # Business logic (email, printing, setup, establishment)
│   │       ├── utils/        # Logger, closure scheduler, thermal printing
│   │       └── migrations/   # Database migration CLI and SQL files
│   └── src/              # React / TypeScript frontend (port 3000)
│       ├── components/   # UI components (POS, Admin, Settings, Legal, etc.)
│       ├── hooks/        # Custom React hooks (state/logic/API per feature)
│       ├── services/     # API service layer and data caching
│       ├── types/        # Shared TypeScript type definitions
│       └── utils/        # Utilities (currency formatting, performance)
├── docs/                 # Documentation (learning course + patch notes)
│   ├── course/           # 10-chapter progressive learning guide
│   └── patch-notes/      # 45 fix/improvement documents from code audit
├── scripts/              # Deployment & setup scripts
├── .github/workflows/    # CI/CD pipeline (GitHub Actions)
└── backups/              # Database backups (not committed)
```

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — currently deployed at mosehxl.com |
| `development` | V2 — clean rewrite, active development target |

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI 5, React Router 6
- **Backend**: Node.js 18+, Express 4, TypeScript 5
- **Database**: PostgreSQL 13+ with **shared-table multi-tenancy** (`establishment_id` scoping)
- **Auth**: JWT (bcrypt passwords, 12h/7d token expiry)
- **Email**: SendGrid (with Nodemailer fallback)
- **Security**: PostgreSQL-backed rate limiting, CORS, input sanitization, security headers
- **Deployment**: Nginx reverse proxy, systemd services
- **CI/CD**: GitHub Actions (lint, type-check, test, security scan, Lighthouse)

---

## Code Quality & Cleanliness

The codebase is structured for **professional-grade maintainability** and safe expansion.

### Single source of truth
- **Auth & establishment context**: `middleware/auth.ts` defines `requireAuth`, `getEstablishmentId`, and role gates; all route files import from `routes/auth.ts` (re-exports). No duplicated auth helpers.
- **API layer**: Frontend calls go through `services/api/core.ts` (base URL, auth header, timeout). `ApiService` is the main facade; domain modules (`categoriesApi`, `ordersApi`, `legalApi`, etc.) live under `services/api/`. Establishment-account creation uses the same `request()` from `api/core` via `establishmentAccountApi.ts`.
- **Formatting**: `utils/formatCurrency.ts` for EUR (fr-FR); `utils/formatDate.ts` for date/time and date-only. Components use these instead of inline formatters.
- **Validation**: Backend uses `middleware/validation.ts` (`validateBody`, `validateParams`, `commonValidations`). No ad-hoc validation in route handlers for shared rules.
- **Types**: Shared types in `src/types/` (e.g. `User`, `Order`, `Category`); backend types in `models/` and `types/`. Single definition per concept.

### Separation of concerns
- **Backend**: Routes only orchestrate; business logic in `services/` and `models/`. No file over ~500 lines; order flows split into `orderCRUD`, `orderPayment`, `orderLegal`, `orderAudit`.
- **Frontend**: Per-feature hooks (`usePOSState`, `usePOSLogic`, `usePOSAPI`; same pattern for History, Menu, Closure). Containers compose hooks and pass data to presentational components.
- **No monoliths**: Largest source files are ~560 lines (e.g. printing service, auth routes); most are under 350.

### Where the rules bend (by design)
- **PrinterSetup.tsx** uses `fetch(apiConfig.getEndpoint(...))` for printing config/test so the backend URL is correct; auth can be added via headers when printing routes are fully secured.
- **establishmentAccountApi** is a separate module from `ApiService` because it serves a single flow (invitation-based account creation) and uses the same `request()` from `api/core` for consistency.

---

## Features

### POS (Point of Sale)
- Product grid with category filter and accent-normalized search
- Cart management with quantity editing
- Simple payment (cash/card) with change calculation and tip support
- Split payment across multiple sub-bills with mixed cash/card
- Happy hour pricing (percentage or fixed discount per product)
- TTC pricing model (French standard — tax included in displayed prices)

### Menu Management
- Create, edit, archive and restore categories and products
- Soft delete when products have order history (legal preservation)
- Hard delete when never used in orders
- Cascade archiving: archiving a category archives all its products

### History
- Full order history with search (by ID, date, payment method, amount)
- Business-day statistics (revenue, card/cash breakdown, top products)
- Return/cancellation processing

### Settings
- Business information (name, address, SIRET, TVA)
- Closure schedule configuration (daily closure time, auto-closure toggle, grace period)
- Printer setup
- Payment method configuration

### Legal Compliance (French Law)
See [compliance section below](#legal-compliance--french-law) for full details.

### System Admin (Multi-Tenant)
A separate interface for `system_admin` role users to manage:
- Establishments (create, invite, monitor)
- System-level users
- Security logs and audit trail
- Dashboard with platform-wide metrics

Foundation for future SaaS multi-tenant expansion.

---

## Legal Compliance — French Law

This system implements the four **ISCA pillars** required by Article 286-I-3 bis du CGI (French fiscal certification for cashier software).

### Certification Requirements

| Pillar | French | Implementation | Status |
|--------|--------|----------------|--------|
| **I** — Inaltérabilité | Immutability | Append-only `legal_journal` table with cryptographic SHA-256 hash chain. Each entry's hash includes the previous entry's hash, making the chain tamper-evident. DB trigger prevents UPDATE/DELETE on the table. | ✅ Implemented |
| **S** — Sécurisation | Security | Audit trail in `audit_trail` table. All logins, logouts, user creation, permission changes, and order operations are logged with IP, user-agent, user ID, and timestamp. | ✅ Implemented |
| **C** — Conservation | Preservation | Closure bulletins (`closure_bulletins` table) — daily, weekly, monthly, annual. Each bulletin captures total transactions, amounts, VAT breakdown by rate, and payment method breakdown for the period. Automatic daily closure scheduler runs at 02:00 Paris time in production. Bulletins are scoped per-establishment for multi-tenant isolation. | ✅ Implemented |
| **A** — Archivage | Archiving | Archive export system (`archive_exports` table) with HMAC-SHA256 digital signatures. Export in CSV, XML, JSON formats. Each export has a file hash for integrity verification. Archive secret key is required in production (no hardcoded fallbacks). | ✅ Implemented |

### What Is Logged

Every completed sale writes a `SALE` entry to the legal journal. Every refund/cancellation writes a `REFUND` entry. Closure bulletins write `CLOSURE` entries. System events write `ARCHIVE` entries.

> **Note (V2):** Legal journal and audit trail are written on every completed order and refund; see `DEVELOPMENT-STATE.md` for full status.

### Certification Readiness

- **AFNOR NF525** — Ready; critical fixes applied (see `DEVELOPMENT-STATE.md`)
- **LNE certification** — Ready after the same 7 fixes
- **Fine risk** — €7,500 per non-compliant register; system is architecturally compliant, fixes needed for runtime correctness

### Compliance References

- `MuseBar/backend/src/models/legal-schema.sql` — Legal tables schema
- `MuseBar/backend/src/models/legalJournal/` — Journal operations, queries, signing, closure
- `MuseBar/backend/src/routes/legal/` — Legal API routes

---

## Database Schema

### Core POS Tables
| Table | Purpose |
|-------|---------|
| `categories` | Product categories with default tax rate, color, and establishment scoping |
| `products` | Products with price (TTC), tax rate, happy hour config, establishment scoping |
| `orders` | Orders with total, tax, payment method, tips, change, establishment scoping |
| `order_items` | Line items per order with exact tax amounts (DECIMAL 12,4 precision) |
| `sub_bills` | Sub-bills for split payments |

### Legal Compliance Tables
| Table | Purpose |
|-------|---------|
| `legal_journal` | Immutable transaction journal with SHA-256 hash chain |
| `closure_bulletins` | Daily/weekly/monthly/annual closure bulletins (per-establishment) |
| `audit_trail` | User action audit log (who, what, when, where) |
| `archive_exports` | Archive export records with HMAC integrity signatures |
| `closure_settings` | Auto-closure configuration (time, timezone, grace period) |

### Auth & User Tables
| Table | Purpose |
|-------|---------|
| `users` | Users with email, bcrypt hash, role, establishment link |
| `permissions` | Available permission names |
| `user_permissions` | User-to-permission join table (batch INSERT...SELECT) |
| `business_settings` | Business info (name, address, SIRET, TVA) per establishment |

### Multi-Tenant Tables
| Table | Purpose |
|-------|---------|
| `establishments` | Tenant establishments with subscription info and schema isolation |
| `user_invitations` | Pending user invitations with secure tokens |
| `password_reset_requests` | Password reset tokens |
| `email_logs` | Email delivery tracking |
| `establishment_setup_progress` | Setup wizard progress tracking |
| `establishment_status_transitions` | Establishment lifecycle audit |
| `rate_limit_store` | PostgreSQL-backed rate limit counters (shared across processes) |

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 13+
- A `.env` file in `MuseBar/backend/` (see below)

### Environment Variables (`MuseBar/backend/.env`)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mosehxl_development
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_minimum_32_characters
CORS_ORIGIN=http://localhost:3000
SENDGRID_API_KEY=your_sendgrid_key   # optional, for email features
ARCHIVE_SECRET_KEY=your_archive_key  # required in production, optional in dev
```

### Development
```bash
# Backend
cd MuseBar/backend
npm install
npm run dev

# Frontend (separate terminal)
cd MuseBar
npm install
npm start
```

### Production
```bash
cd scripts
./setup-production.sh          # first-time server setup
./start-production-servers.sh  # start backend + frontend
```

### Database Migrations
```bash
cd MuseBar/backend
npm run migration:status   # check current state
npm run migration:migrate  # apply pending migrations
npm run migration:rollback # undo the last migration
npm run migration:create   # create a new migration file
```

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `GET /api/health` | Health check |
| `/api/auth` | Login, register, token refresh, user/permission management |
| `/api/categories` | Category CRUD (establishment-scoped) |
| `/api/products` | Product CRUD (establishment-scoped) |
| `/api/orders` | Order CRUD, payment operations, cancellations |
| `/api/orders/payment` | Retour, cancel-unified (refund/cancellation endpoints) |
| `/api/legal/journal` | Legal journal entries, integrity verification |
| `/api/legal/closure` | Closure bulletin creation and retrieval |
| `/api/legal/compliance` | Compliance status and reports |
| `/api/legal/archive` | Archive exports with digital signatures |
| `/api/user-management` | User invitations |
| `/api/establishments` | Establishment CRUD (system admin) |
| `/api/enhanced-establishments` | Establishment creation workflow and stats |
| `/api/setup` | Initial setup wizard |
| `/api/establishment-account-creation` | Invitation-based account setup |
| `/api/docs` | Swagger/OpenAPI documentation |

---

## User Roles

| Role | Interface | Access |
|------|-----------|--------|
| `system_admin` | System Admin UI | Full system — establishments, users, security logs |
| `establishment_admin` | Business UI | All POS tabs based on permissions |
| `cashier` | Business UI | POS tabs granted by admin |

Granular permissions (granted per user): `access_pos`, `access_menu`, `access_happy_hour`, `access_history`, `access_settings`, `access_compliance`. Establishment admins receive all permissions by default.

---

## Documentation

Full documentation lives in the `docs/` folder:

- **[Table of Contents](docs/00-TABLE-OF-CONTENTS.md)** — Start here for navigation
- **[Course](docs/course/)** — 10-chapter progressive learning guide (beginner-friendly)
- **[Patch Notes](docs/patch-notes/)** — 45 documented fixes from the code audit
- **[Development State](DEVELOPMENT-STATE.md)** — Current status, 7 critical fixes, known issues

---

## Code Quality Measures Applied

After a comprehensive code audit, 45 fixes were applied covering:

- **Security**: Removed hardcoded secrets, fixed SQL injection vectors, secured unauthenticated endpoints, removed server fingerprinting headers, replaced Math.random with crypto.randomUUID
- **Architecture**: Consolidated error handling into one system, removed dual database pools, unified schema creation, consolidated password validation rules
- **Dead Code**: Removed unused controllers, services, shim files, debug console.logs, Mongoose handling remnants
- **Performance**: Fixed N+1 queries, moved rate limiting to PostgreSQL, fixed infinite React re-render loops, converted per-request service instantiation to singletons
- **Type Safety**: Replaced `any` types with proper TypeScript types, unified ClosureBulletin type, removed stale type packages
- **Legal Compliance**: Scoped closure bulletins per-establishment, fixed timezone strategy, aligned schema SQL files with actual database state
- **CI/CD**: Fixed pipeline configuration, Lighthouse integration, GitHub Actions versions

See the [patch notes](docs/patch-notes/) for detailed documentation of every change.

---

## License

Copyright © 2024-2026 Elliot Vergne. All rights reserved. Proprietary and confidential.
