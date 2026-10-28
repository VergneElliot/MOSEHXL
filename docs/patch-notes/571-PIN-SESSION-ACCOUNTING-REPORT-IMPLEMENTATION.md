# 571 — PIN session accounting report (IMPLEMENTATION)

## Summary

Operational (non-fiscal) PIN session CA sheets: aggregate by `orders.pin_session_id`, persist append-only snapshots, History UI to generate + browser-print. PIN close rules unchanged.

Fiscal impact: **MINOR**.

## Delivered

- Migration `2026_10_28_15_40_00_pin_session_reports.sql`
- `pinSessionReportAggregate.ts` + `PinSessionReportModel`
- Routes under `/api/auth/pin/sessions` (`by-day`, `report-preview`, `reports`)
- History `PinSessionReportPanel` + `pinSessionReportPrint`

## Tests

- `pinSessionReportAggregate.test.ts`
- `pinSessionReports.permissions.test.ts`
- `pinSessionReportPrint.test.ts`

## Verification

- [x] New tests green
- [x] Fiscal impact: MINOR
