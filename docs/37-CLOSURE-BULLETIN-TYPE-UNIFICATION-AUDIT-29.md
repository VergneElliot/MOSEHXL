# Fix: ClosureBulletin Type Unification (Audit #29)

This doc explains **why** defining the same type in multiple places with different shapes is a problem, **what** the canonical `ClosureBulletin` type is, and **how** we unified all usages to a single source of truth.

---

## 1. What is ClosureBulletin?

A **closure bulletin** (bulletin de clôture) is a legal record that summarizes a period of sales: totals, VAT breakdown, payment methods, sequence range, and a hash for integrity. The backend stores them in the `closure_bulletins` table and exposes them via e.g. `GET /api/legal/closure/bulletins`. The frontend uses this type in:

- Closure management (list/create bulletins)
- Legal compliance dashboard (reports, integrity checks)

So one domain concept, one API shape — we want **one TypeScript type** that matches the API and is used everywhere.

---

## 2. What was the problem?

The type was defined in **three (and a half) places**, each with a **slightly different shape**:

| Location | Shape differences |
|----------|-------------------|
| **types/api.ts** | Full shape: `id`, `closure_type`, `period_start`/`period_end`, `total_*`, `vat_breakdown`, `payment_methods_breakdown`, `first_sequence`, `last_sequence`, `closure_hash`, `is_closed`, `closed_at`, `created_at`, optional `tips_total`/`change_total`. Matches the backend. |
| **hooks/useClosureState.ts** | Duplicate of the same full shape (identical to api.ts). |
| **hooks/useLegalCompliance.ts** | Different: `closure_date`, `hash` instead of `period_start`/`period_end` and `closure_hash`; fewer fields. |
| **LegalComplianceDashboard/types.ts** | Another variant: `id` as **string**, `closure_type` as plain string, some fields `string \| null` or `number \| null`; no `vat_breakdown`, `closure_hash`, etc. |

**Why that’s a problem:**

- **Drift:** Changing the API (e.g. adding a field) forces you to remember to update several type definitions; one is always forgotten and types lie.
- **Bugs:** Code that expects `closure_hash` may receive a type that only has `hash`, or code that uses `id` as number may break if another file types it as string.
- **No single contract:** There is no single “this is what a closure bulletin looks like” that both the API and all UI code agree on.

---

## 3. What we changed

### 3.1 Single source of truth: types/api.ts

The **canonical** definition stays in `src/types/api.ts` (and is re-exported from `src/types/index.ts`). It already matched the backend `closure_bulletins` table and the API response:

- `id: number`
- `closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL'`
- `period_start`, `period_end` (strings, ISO dates)
- `total_transactions`, `total_amount`, `total_vat`
- `vat_breakdown`, `payment_methods_breakdown` (typed objects)
- `first_sequence`, `last_sequence`, `closure_hash`
- `is_closed`, `closed_at`, `created_at`
- Optional: `tips_total`, `change_total`

No change to the type itself; we only stopped defining it elsewhere.

### 3.2 useClosureState.ts

- **Removed** the local `ClosureBulletin` interface (duplicate of api.ts).
- **Imported** `ClosureBulletin` from `../types` and **re-exported** it so that existing imports (e.g. `useClosureAPI`, `BulletinsTable`, `Closure/index`) can still get the type from this hook file if they want, but the type now comes from the central definition.

### 3.3 useLegalCompliance.ts

- **Removed** the local `ClosureBulletin` interface (the one with `closure_date` and `hash`).
- **Imported** `ClosureBulletin` from `../types`.
- No code in this file was using `closure_date` or `hash`; it only stored/typed the list, so no field renames were required.

### 3.4 LegalComplianceDashboard/types.ts

- **Removed** the local `ClosureBulletin` interface (the one with `id: string` and reduced fields).
- **Imported** `ClosureBulletin` from `../../../types` and **re-exported** it so that `ComplianceState`, `ComplianceReportsProps`, and `useCompliance` keep using the same type; the dashboard index that re-exports `ClosureBulletin` from `./types` now exposes the canonical type.

### 3.5 No changes to UI or API

- **ComplianceReports.tsx** and other components already used fields that exist on the canonical type (`id`, `closure_type`, `period_start`, `period_end`, `total_transactions`, `total_amount`, `total_vat`, `is_closed`, `created_at`). They did not rely on the old dashboard-specific `id: string` or missing fields.
- Backend and API response shape were already aligned with `types/api.ts`; no backend changes.

---

## 4. Summary

| Before | After |
|--------|--------|
| 3+ definitions of ClosureBulletin with different shapes | 1 definition in `types/api.ts`, re-exported from `types/index.ts` |
| useClosureState, useLegalCompliance, dashboard each had their own type | All import (and optionally re-export) the canonical type from `types` |
| Risk of drift and bugs when API or DB changes | One type to update; all consumers stay in sync |

**Takeaway:** For any type that represents an API or domain entity, define it **once** (ideally next to the API types or in a shared types module) and **import** it everywhere. Re-export only for convenience (e.g. so callers can still do `import { ClosureBulletin } from './useClosureState'`); the definition lives in one place.
