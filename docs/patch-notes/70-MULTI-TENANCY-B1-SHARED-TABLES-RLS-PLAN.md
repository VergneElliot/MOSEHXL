# 70 — B1: Multi-tenancy decision (shared tables) + audit-proof isolation (PLAN)

Date: 2026-04-24  
Branch: `development`  
Status: **Plan only** (implementation will be recorded in the companion implementation doc).

This document is the plan of record for audit **Phase B1**: choosing the long-term multi-tenancy model for a **sellable, legally compliant** French POS (CGI 286‑I‑3 bis / NF525).

---

## 0) Decision (what we are committing to)

### 0.1 Target market

- **Primary goal (B)**: sell to **multiple independent establishments** (different legal entities / different SIRETs).
- **Also possible (A)**: a group with multiple sites. This plan remains compatible because it keeps fiscal records **scoped**, and reporting/aggregation can be built above without mixing legal journals.

### 0.2 Chosen technical model

We choose **Option 1**:

- **Shared tables** (single Postgres schema, typically `public`)
- Tenant isolation via **`establishment_id`** on tenant-owned rows
- Plus **defense in depth** so isolation does not rely only on developers remembering `WHERE establishment_id = $1`.

**Important:** French fiscal compliance does **not** require schema-per-tenant. It requires that each legal entity can produce its own fiscal evidence without mixing another entity’s data.

---

## 1) Legal/fiscal boundary (what must be isolated)

For multi-tenant SaaS, each establishment must have **its own**:

- **Legal journal chain** (sequence + hash chain): `legal_journal` scoped by `establishment_id`
- **Closure bulletins**: `closure_bulletins` scoped by `establishment_id`
- **Archive exports**: `archive_exports` scoped by `establishment_id`
- **Audit trail** attribution and any audit endpoints: `audit_trail` scoped by `establishment_id`

This repo’s Phase A3 implemented the critical journal scoping; B1 makes tenant isolation **provable** and hard to regress.

---

## 2) Why “shared tables” can still be audit-proof

The main risk of shared tables is not legality; it is **accidental cross-tenant access** (a missing filter, an unscoped query, an unsafe admin endpoint).

So B1 adds two guardrails:

1. **DB-level enforcement** (Row Level Security) so the database blocks cross-tenant reads/writes even if application code forgets a filter.
2. **Audited platform support access**: `system_admin` can access a tenant **only** via explicit impersonation flows that leave a forensic trail.

---

## 3) Implementation outline (what we will build in B1)

### 3.1 Documentation + codebase contract (first)

- Update `README.md` to accurately state the chosen model: shared-table multi-tenancy.
- Add “legacy” banners to older docs that still teach schema-per-tenant so the repo remains an educational reference without misleading new contributors.

### 3.2 Remove (or hard-deprecate) unused schema-per-tenant runtime paths

The audit found schema-per-tenant is **advertised** but not used at runtime. We will:

- Deprecate `SchemaManager`/`schema_name` as the default isolation mechanism (and eventually remove it).
- Ensure establishment creation uses the shared-table model consistently (one schema contract).

### 3.3 DB-level tenant isolation with Row Level Security (RLS)

- Add RLS policies for tenant-owned tables.
- Standard pattern:
  - On request start, set a session variable: `SET LOCAL app.establishment_id = '<uuid>'`.
  - RLS uses `current_setting('app.establishment_id', true)` to enforce `establishment_id`.

**Phase order (risk-based):**

1. Fiscal tables: `legal_journal`, `closure_bulletins`, `archive_exports`, `audit_trail`
2. Order tables: `orders`, `order_items`, `sub_bills`
3. Catalog/settings tables: `products`, `categories`, `business_settings`, etc.

### 3.4 Scheduler remains per establishment (closure times can differ)

Auto-closure is compatible with shared tables:

- Each establishment has its own `closure_settings` (time/timezone/enable).
- The scheduler loops establishments and generates closures per tenant.

### 3.5 Audited support access (“yes, but audited”)

We will implement a safe support story:

- `system_admin` can open an **impersonation session** for a specific `establishment_id`
- Must include a reason; time-bounded
- Writes to audit trail (who, which tenant, start/end)
- Sets DB tenant context for all queries during the session (RLS applies)

No “global list all tenants’ orders/journals/archives” endpoints.

---

## 4) Acceptance criteria

- README and course docs reflect the shared-table model (no more “schema-based multi-tenancy” as the default).
- Cross-tenant reads/writes are blocked at the **database** layer for tenant-owned tables.
- All establishment-scoped routes fail closed when `establishment_id` is missing.
- Support access is explicit and audited (no permanent global fiscal access).

---

## 5) Companion docs

- **Implementation record** (to be created when code changes ship): `docs/patch-notes/71-MULTI-TENANCY-B1-SHARED-TABLES-RLS-IMPLEMENTATION.md`
- Audit reference: `docs/audits/2026-04-21-repo-audit-and-remediation-plan.part-3.md` Phase B1

