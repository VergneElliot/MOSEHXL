# 473 — Staff labor compliance, congés, pointage UI (IMPLEMENTATION slice A)

Date: 2026-09-02  
Plan: [472-STAFF-LABOR-COMPLIANCE-POINTAGE-CONGES-PLAN.md](./472-STAFF-LABOR-COMPLIANCE-POINTAGE-CONGES-PLAN.md)

---

## Delivered

### Schema

- Migration `2026_09_02_16_00_00_staff_leave_and_labor_settings.sql`
  - `staff_leave_requests` — types CP/RTT/maladie/etc., approval workflow
  - `staff_leave_entitlements` — annual CP/RTT balances per employee
  - RLS tenant policies

### Backend

- `services/labor/laborCompliance.ts` — French CHR default thresholds, violation analysis, planned-vs-actual reconciliation (unit tests)
- `services/labor/laborReportService.ts` — compliance report builder, CSV export, punch/leave conflict check
- `models/staffLeave.ts`, `models/laborSettings.ts`
- Routes `/api/admin/leaves` (CRUD + balances)
- `/api/admin/time-clock/compliance`, `/export`
- Shift create blocked on approved leave overlap
- Clock-in/punch returns `leave_warning`; optional hard block via `block_punch_on_leave` setting

### Frontend

- `TimeClockPanel` — tabs: Terminal | Rapport heures | Conformité; CSV export
- `PlanningPanel` — congés on calendar, request dialog, pending approval queue
- `adminSpace.ts` — leave + compliance API helpers

### Ops / hygiene

- Editor fixes: CI postgres image, trivy pin, tsconfig `ignoreDeprecations: "5.0"`
- Runbook: `docs/runbooks/RESERVATIONS-PRODUCTION-VERIFY.md`

---

## Remaining (slice B)

- Labor settings UI (establishment admin)
- Entitlement editor in Planning
- Half-day congés toggles in UI
- Route integration tests
- Employee self-service leave request (non-admin submit → pending)

---

## Verify locally

```bash
cd MuseBar/backend && npm run migration:migrate
npm test -- src/services/labor/laborCompliance.test.ts
npm run type-check
cd ../.. && npm run type-check --workspace MuseBar
```
