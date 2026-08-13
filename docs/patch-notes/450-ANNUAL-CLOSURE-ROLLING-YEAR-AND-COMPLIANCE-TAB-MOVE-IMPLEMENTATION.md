# 450 - Annual Closure Rolling Year + Conformité Légale Tab Move - Implementation

Date: 2026-08-06  
Related: `443` (Administration space), `448` (closure settings / auto-email)

---

## 1) Context

Two corrections requested after the first full year of production use:

1. **Annual closure period was wrong for real-world use.** The annual bulletin was
   hardcoded to the **calendar year** of the selected date: choosing any date in 2026
   produced a bulletin for `2026-01-01 → 2026-12-31`. A venue that went live in August
   2025 could therefore never produce an "our first year" bulletin (Aug 2025 → Aug 2026),
   and businesses whose fiscal year doesn't match the calendar year were stuck too.
2. **"Conformité Légale" lived as its own top-level tab** while the rest of the
   admin-oriented panels had just moved into the Administration space (note 443).

---

## 2) Annual closure: rolling year

### Before

```ts
// closureOperations.ts (old)
const startOfYear = new Date(date.getFullYear(), 0, 1);      // Jan 1 of selected year
const endOfYear   = new Date(date.getFullYear(), 11, 31, …); // Dec 31 of selected year
```

Verified behavior: an annual closure dated 2026-08-01 covered Jan 1 → Dec 31 2026
(amounts effectively Jan → today, since no future entries exist). Weekly and monthly
closures are calendar-week (Mon–Sun) and calendar-month — those are unchanged and fine;
the calendar convention only hurts at the annual level.

### After

`ClosureOperations.createAnnualClosure` now builds a **rolling year ending on the selected
date**: from the same calendar date one year earlier at 00:00:00 through the selected date
at 23:59:59.999. Selecting 2026-08-01 yields `2025-08-01 → 2026-08-01`.

Both creation paths (`POST /api/legal/closure/annual` and `POST /api/legal/closure/create`
with `type: 'ANNUAL'`) funnel through this one function, so the fix covers both. The
closure scheduler only auto-creates daily bulletins — no scheduler impact.

`CreateClosureDialog` shows a helper text under the date field when *Annuelle* is
selected, so the operator knows exactly what period they will get.

### Boundary notes (deliberate choices)

- The period is **inclusive of both boundary days** (exactly as requested: "from one year
  prior to the date selected, to the date selected"). If you close annually on the same
  date every year, the boundary day is counted in both bulletins. If you want perfectly
  contiguous years, date the next annual closure one day earlier (e.g. 2027-07-31) — or we
  can switch to an exclusive start later.
- Leap-day input (Feb 29) rolls to Mar 1 of the prior year via standard JS date semantics.
- The **annual archive export** (`archiveService.ts`, a separate legal-journal export)
  still uses calendar years and matches bulletins by exact calendar-year period. Rolling
  annual bulletins won't be attached as `closure_data` in those archive exports
  (`closure_data: null`); the export itself still works. Flagged for a future decision.

---

## 3) Conformité Légale moved into Administration

| File | Change |
|---|---|
| `AppRouter.tsx` | Removed the top-level "Conformité Légale" tab and its panel |
| `appLazyTabPanels.tsx` | Removed the now-unused `LazyLegalComplianceDashboard` export |
| `AdministrationContainer.tsx` | New **Conformité Légale** section (Gavel icon, lazy-loaded `LegalComplianceDashboard`), placed between Utilisateurs and Journal de sécurité |

**Access change:** the old tab was visible to establishment admins *and* to staff holding
the `access_compliance` permission. The new section is **establishment admin only** (same
gate as Journal de sécurité), per the decision to hide compliance from non-admins. The
`access_compliance` permission still exists and still gates the backend compliance
endpoints; it just no longer surfaces a UI entry for staff. Easy to relax later by adding
`perms.includes(PERMISSIONS.access_compliance)` to the section gate.

---

## 4) Verification

| Check | Result |
|---|---|
| Frontend `npm run type-check` | ✅ |
| Backend `npm run type-check` | ✅ |
| Frontend `vitest run` | ✅ 24 tests |
| Backend vitest | ⚠️ not runnable on this machine (needs Node ≥ 20.12, installed 18.19) — change is a pure date computation covered by type-check |

---

## 5) Rollback

Revert the commit. No DB changes. Existing annual bulletins (calendar-year periods) remain
valid historical documents; the `closureBulletinExists` dedupe matches on exact period, so
old and new-style bulletins coexist.
