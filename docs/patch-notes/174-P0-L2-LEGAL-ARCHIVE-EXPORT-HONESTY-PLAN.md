# 174 - P0-L2 (Legal Archive Export Honesty) - Plan

Date: 2026-04-29  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (L2)

## Why this patch exists

The audit identified a compliance-critical truth gap:

- `POST /api/legal/archive/:id/export` currently returns a success payload
  (`"Archive exported successfully"`) while the code itself states the feature is not implemented.
- This is a false-success contract on a legal/compliance surface.

For trust, auditability, and legal posture, an endpoint must never claim a successful export if no export happened.

## Beginner-friendly framing

Right now the route says:

1. "Export worked" to the user,
2. but under the hood it only returns placeholder JSON.

That is like printing "ticket issued" when the printer cable is unplugged.
Better behavior is "fail closed":

- return "not implemented yet",
- keep it explicit and machine-readable,
- do not fake success.

## Scope

### In scope

1. Update `/api/legal/archive/:id/export` contract to explicit **501 Not Implemented**.
2. Preserve existing access control and input validation:
   - still requires auth + `access_closure`,
   - still validates numeric archive id.
3. Update tests to assert the new fail-closed contract.
4. Document implementation and verification.

### Out of scope

- Building full export pipeline (real file generation/download transport).
- Implementing PDF conversion (`convertToPDF`) or annual-content handling in `ArchiveService`.
- Any closure or software-events journaling tasks.

## Design choices

1. **Fail closed now (501) instead of fake 200**
   - fastest and safest integrity fix with minimal blast radius.

2. **Keep route shape stable except status/result**
   - same URL, same permission gate, same id validation;
   - only the semantic result changes from false-success to explicit not-implemented.

3. **Clear error code for future frontend handling**
   - include a stable code string so UI can display "coming soon" cleanly.

## Step-by-step strategy

### Step 1 - Route contract hardening

File: `MuseBar/backend/src/routes/legal/archive.ts`

Plan:
- In `POST /:id/export`:
  - keep archive id parsing and 400 on invalid id,
  - remove placeholder `export_data` success payload,
  - return `501` with explicit message + stable error code (e.g. `LEGAL_ARCHIVE_EXPORT_NOT_IMPLEMENTED`).

### Step 2 - Tests

File: `MuseBar/backend/src/routes/legal/legalArchiveClosure.permissions.test.ts`

Plan:
- Update the allow-path test for `/archive/:id/export`:
  - currently expects `200` + fake success payload,
  - should now expect `501` + explicit not-implemented contract.
- Keep deny-path and invalid-id tests unchanged.

### Step 3 - Verify

Run:
- targeted legal archive/closure permissions test suite,
- backend type-check,
- lint diagnostics for edited files.

## Acceptance criteria

1. `/api/legal/archive/:id/export` no longer returns fake success.
2. Endpoint returns explicit 501 + stable code when called with valid id and permission.
3. Existing permission behavior remains unchanged.
4. Tests and type-check pass.
5. Plan + implementation patch notes are added.

## Risks and mitigations

- Risk: frontend expects 200 today.
  - Mitigation: explicit 501 + stable code makes break intentional and easy to handle.
- Risk: users interpret this as regression.
  - Mitigation: this is a correctness fix; fake success was dangerous for compliance.
