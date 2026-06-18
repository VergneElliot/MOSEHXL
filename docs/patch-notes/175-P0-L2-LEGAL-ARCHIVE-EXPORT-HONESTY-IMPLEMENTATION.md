# 175 - P0-L2 (Legal Archive Export Honesty) - Implementation

Date: 2026-04-29  
Related plan: `docs/patch-notes/174-P0-L2-LEGAL-ARCHIVE-EXPORT-HONESTY-PLAN.md`

## What was implemented

This patch removes the false-success behavior on legal archive export and replaces it with an explicit fail-closed contract.

---

## 1) Hardened archive export route contract

Updated:
- `MuseBar/backend/src/routes/legal/archive.ts`

Changes in `POST /api/legal/archive/:id/export`:
- Kept existing guardrails:
  - auth + `access_closure` permission (router-level middleware unchanged),
  - invalid archive id still returns 400.
- Removed placeholder success payload (`"Archive exported successfully"` with fake `export_data`).
- Added explicit not-implemented response:
  - status: `501`,
  - body:
    - `error: "Archive export is not implemented yet"`,
    - `code: "LEGAL_ARCHIVE_EXPORT_NOT_IMPLEMENTED"`,
    - compliance note clarifying intentional disablement.

Result:
- Route no longer claims a successful regulatory export when no export has happened.

---

## 2) Updated regression test contract

Updated:
- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Changes:
- Replaced prior allow-path expectation (200 + export payload contract) with:
  - `501` status,
  - explicit error message,
  - explicit stable error code.
- Kept deny-path and invalid-id tests unchanged.

Result:
- Test suite now enforces fail-closed honesty for archive export until real implementation lands.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/legal/legalArchiveClosure.permissions.test.ts` ✅
   - Result: 1 file passed, 17 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `archive.ts`
     - `legalArchiveClosure.permissions.test.ts`
     - `174-P0-L2-...-PLAN.md`

---

## Outcome

P0-L2 is now implemented:

- `/api/legal/archive/:id/export` is compliance-honest and fail-closed,
- false-success export messaging has been removed,
- route behavior is protected by regression tests.

Follow-up (separate patch scope):
- implement real archive export pipeline (including annual export content and actual file/PDF output),
- then replace 501 contract with true export response.
