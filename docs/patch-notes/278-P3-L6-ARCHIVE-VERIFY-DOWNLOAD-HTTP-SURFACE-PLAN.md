# 278 - P3-L6 (Archive verify/download HTTP surface) - Plan

Date: 2026-05-21  
Source audit: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md` (P3-L6)

## Why this patch exists

The archive service already implements:

- `verifyArchiveExport(id, establishmentId)`
- `downloadArchiveExport(id, establishmentId)`

but there was no HTTP surface for inspectors/operators to trigger verification
or retrieve files. At the same time, `POST /api/legal/archive/:id/export`
returned a hardcoded `501`, which was explicitly flagged by the audit.

## Scope

### In scope

1. Add HTTP endpoint to verify archive integrity/signature.
2. Add HTTP endpoint to download archive files.
3. Replace `POST /archive/:id/export` `501` behavior with an implemented path
   (legacy alias to download).
4. Add/adjust route tests for permission, success, and not-found behavior.

### Out of scope

- Frontend UX changes for archive verification/download buttons.
- Archive generation format expansion.

## Strategy

### Step 1 - Archive routes

In `routes/legal/archive.ts`:

1. Add `POST /:id/verify`:
   - validates id,
   - calls `ArchiveService.verifyArchiveExport`,
   - maps "Archive export not found" to 404,
   - returns verification result payload for operators.
2. Add `GET /:id/download`:
   - validates id,
   - calls `ArchiveService.downloadArchiveExport`,
   - returns 404 when unavailable,
   - streams file with `res.download(...)`.
3. Change `POST /:id/export`:
   - remove `501`,
   - keep route as legacy alias to download (with deprecation header).

### Step 2 - Tests

In `legalArchiveClosure.permissions.test.ts`:

1. Extend archive service mocks with verify/download methods.
2. Add tests for:
   - verify success payload,
   - verify missing archive -> 404,
   - download endpoint returns file stream,
   - legacy `/export` alias now returns file stream + deprecation header.
3. Remove obsolete expectation that `/export` returns `501`.

### Step 3 - Verify

1. Targeted legal archive/closure route tests.
2. Backend type-check.
3. Full backend test suite.
4. Lint diagnostics on touched files.

## Acceptance criteria

1. Archive verification is reachable via authenticated HTTP endpoint.
2. Archive download is reachable via authenticated HTTP endpoint.
3. `POST /archive/:id/export` no longer returns hardcoded `501`.
4. Permission and behavior are covered by regression tests.

