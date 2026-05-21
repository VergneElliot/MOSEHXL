# 279 - P3-L6 (Archive verify/download HTTP surface) - Implementation

Date: 2026-05-21  
Related plan: `docs/patch-notes/278-P3-L6-ARCHIVE-VERIFY-DOWNLOAD-HTTP-SURFACE-PLAN.md`

## What changed

### 1) Added archive verification endpoint

Updated:

- `MuseBar/backend/src/routes/legal/archive.ts`

Added:

- `POST /api/legal/archive/:id/verify`

Behavior:

1. Validates archive id.
2. Calls `ArchiveService.verifyArchiveExport(id, establishmentId)`.
3. Maps missing archive (`Archive export not found`) to `404`.
4. Returns verification payload (`isValid`, `errors`) for compliance operators.

### 2) Added archive download endpoint

Updated:

- `MuseBar/backend/src/routes/legal/archive.ts`

Added:

- `GET /api/legal/archive/:id/download`

Behavior:

1. Validates archive id.
2. Calls `ArchiveService.downloadArchiveExport(id, establishmentId)`.
3. Returns `404` when file is not available for tenant.
4. Streams export file using `res.download(filePath, fileName)`.

### 3) Replaced 501 export placeholder

Updated:

- `MuseBar/backend/src/routes/legal/archive.ts`

Changed:

- `POST /api/legal/archive/:id/export` no longer returns hardcoded `501`.
- Route now behaves as a legacy alias to download and sets `Deprecation: true`.

This preserves backward compatibility while removing the "known broken"
endpoint behavior called out by the audit.

### 4) Expanded permissions/regression tests

Updated:

- `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Changes:

1. Extended `ArchiveService` mocks with:
   - `verifyArchiveExport`
   - `downloadArchiveExport`
2. Added tests for:
   - `/archive/:id/verify` success response,
   - `/archive/:id/verify` missing archive -> `404`,
   - `/archive/:id/download` returning file download response,
   - `/archive/:id/export` legacy alias returning file + deprecation header.
3. Removed obsolete expectation that `/archive/:id/export` returns `501`.

## Verification

Executed:

1. `npx vitest run src/routes/legal/legalArchiveClosure.permissions.test.ts` -> pass
2. `npm run type-check` (backend) -> pass
3. `npx vitest run` (backend full suite) -> pass (`46/46`, `183/183`)
4. lint diagnostics on touched files -> no issues

## Result

P3-L6 is now closed:

- archive verify/download capabilities are exposed through authenticated legal
  routes,
- the previous `501` export placeholder has been replaced with a functional
  compatibility alias.

