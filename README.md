# MOSEHXL — MuseBar POS System

A point-of-sale and bar management system built for French hospitality businesses, with full legal compliance for French fiscal law (Article 286-I-3 bis du CGI).

## Project Structure

```
MOSEHXL/
├── MuseBar/
│   ├── backend/          # Node.js / Express / TypeScript API (port 3001)
│   │   └── src/
│   │       ├── middleware/   # Auth & security middleware
│   │       ├── models/       # DB models, SQL schemas, migrations
│   │       ├── routes/       # Express route handlers
│   │       ├── services/     # Business logic (printing, receipts, orders)
│   │       └── utils/        # Helpers (logger, closure scheduler)
│   └── src/              # React / TypeScript frontend (port 3000)
│       ├── components/   # UI components (POS, Admin, Settings, etc.)
│       ├── hooks/        # Shared React hooks (auth, API)
│       ├── services/     # API service layer
│       └── types/        # Shared TypeScript types
├── docs/                 # Developer & architecture documentation
├── scripts/              # Deployment & setup scripts
└── backups/              # Database backups (not committed)
```

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — currently deployed at mosehxl.com |
| `development` | V2 — clean rewrite, active development target |

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 13+
- **Auth**: JWT (bcrypt passwords, 12h/7d tokens)
- **Email**: SendGrid
- **Deployment**: Nginx reverse proxy, systemd services

---

## Features

### POS (Point of Sale)
- Product grid with category filter and accent-normalized search
- Cart management with quantity editing
- Simple payment (cash/card) with change calculation and tip support
- Split payment across multiple sub-bills with mixed cash/card
- Happy hour pricing (percentage or fixed discount per product)

### Menu Management
- Create, edit, archive and restore categories and products
- Soft delete when products have order history (legal preservation)
- Hard delete when never used in orders

### History
- Full order history with search
- Business-day statistics (CA, card/cash breakdown, top products)
- Return/cancellation processing

### Settings
- Business information (name, address, SIRET, TVA)
- Closure schedule configuration
- Printer setup
- Payment method configuration

### Legal Compliance (French Law)
See [compliance section below](#legal-compliance-french-law) for full details.

### System Admin (Multi-Tenant)
A separate interface for `system_admin` role users to manage establishments, system-level users, and security logs. Foundation for future SaaS multi-tenant expansion.

---

## Legal Compliance — French Law

This system implements the four **ISCA pillars** required by Article 286-I-3 bis du CGI (French fiscal certification for cashier software).

### Certification Requirements

| Pillar | French | Implementation | Status |
|--------|--------|----------------|--------|
| **I** — Inaltérabilité | Immutability | Append-only `legal_journal` table with cryptographic SHA-256 hash chain. Each entry's hash includes the previous entry's hash, making the chain tamper-evident. DB trigger prevents UPDATE/DELETE on the table. | ✅ Implemented |
| **S** — Sécurisation | Security | Audit trail in `audit_trail` table. All logins, logouts, user creation, permission changes, and order operations are logged with IP, user-agent, user ID, and timestamp. | ✅ Implemented |
| **C** — Conservation | Preservation | Closure bulletins (`closure_bulletins` table) — daily, weekly, monthly, annual. Each bulletin captures total transactions, amounts, VAT breakdown by rate, and payment method breakdown for the period. Automatic daily closure scheduler runs at 02:00 Paris time in production. | ✅ Implemented |
| **A** — Archivage | Archiving | Archive export system (`archive_exports` table) with digital signatures. Export in CSV, XML, PDF, JSON formats. Each export has a file hash for integrity verification. | ✅ Implemented |

### What Is Logged

Every completed sale writes a `SALE` entry to the legal journal. Every refund/cancellation writes a `REFUND` entry. Closure bulletins write `CLOSURE` entries. System events write `ARCHIVE` entries.

> **Note (V2 current state):** The legal journal write on order creation is not yet wired in V2's `orderCRUD.ts`. This is item #1 in `DEVELOPMENT-STATE.md`.

### Certification Readiness

- **AFNOR NF525** — Ready after the 7 fixes in `DEVELOPMENT-STATE.md` are applied
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
| `categories` | Product categories with default tax rate and color |
| `products` | Products with price, tax rate, happy hour config |
| `orders` | Orders with total, tax, payment method, tips, change |
| `order_items` | Line items per order |
| `sub_bills` | Sub-bills for split payments |

### Legal Compliance Tables
| Table | Purpose |
|-------|---------|
| `legal_journal` | Immutable transaction journal with hash chain |
| `closure_bulletins` | Daily/weekly/monthly/annual closure bulletins |
| `audit_trail` | User action audit log |
| `archive_exports` | Archive export records with integrity hashes |
| `closure_settings` | Auto-closure configuration (time, timezone, grace period) |

### Auth & User Tables
| Table | Purpose |
|-------|---------|
| `users` | Users with email, bcrypt hash, role, establishment link |
| `permissions` | Available permission names |
| `user_permissions` | User ↔ permission join table |
| `business_settings` | Business info (name, address, SIRET, TVA) |

### Multi-Tenant Tables (V2)
| Table | Purpose |
|-------|---------|
| `establishments` | Tenant establishments with subscription info |
| `user_invitations` | Pending user invitations with tokens |
| `password_reset_requests` | Password reset tokens |
| `email_logs` | Email delivery tracking |

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
```

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `GET /api/health` | Health check |
| `/api/auth` | Login, register, token refresh, user/permission management |
| `/api/categories` | Category CRUD |
| `/api/products` | Product CRUD |
| `/api/orders` | Order CRUD, payment operations, cancellations |
| `/api/legal/journal` | Legal journal entries, integrity verification |
| `/api/legal/closure` | Closure bulletin creation and retrieval |
| `/api/legal/compliance` | Compliance status and reports |
| `/api/legal/archive` | Archive exports |
| `/api/user-management` | User invitations (legacy roles/team routes dismounted) |
| `/api/establishments` | Establishment CRUD |
| `/api/setup` | Initial setup wizard |
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

## License

Copyright © 2024 Elliot Vergne. All rights reserved. Proprietary and confidential.
