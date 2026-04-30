# 210 - P1-L8 (Real archive PDF conversion) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-L8)

## Why this patch exists

`ArchiveService.convertToPDF(...)` is currently a placeholder that returns plain
text, not a real PDF file. This makes `PDF` format misleading and blocks proper
legal archive exports.

## Scope

### In scope

1. Integrate a real backend PDF generator for archive export conversion.
2. Replace placeholder `convertToPDF(...)` with real PDF bytes output.
3. Ensure archive hash/signature/verification logic works for binary exports.
4. Add regression tests proving PDF output is a real PDF artifact.
5. Document implementation and verification.

### Out of scope

- Full invoice generation workflow.
- Thermal receipt printing format redesign.
- Exposing new archive export endpoints (route remains as currently defined).

## Design choices

1. **Use `pdfkit` on backend**
   - Mature Node PDF generator.
   - Produces standard `%PDF` binary output.
   - Works without browser/runtime headless dependencies.

2. **Binary-safe integrity handling**
   - Hash and HMAC signature methods accept `Buffer | string`.
   - Verification reads files as raw `Buffer`, not UTF-8 text.
   - Keeps integrity semantics consistent across JSON/XML/CSV/PDF.

3. **Readable legal archive layout**
   - PDF includes a clear title, export metadata, and serialized payload.
   - Keeps legal references and period details visible for operators/audits.

## Strategy

### Step 1 - Dependency setup

File:
- `MuseBar/backend/package.json`

Plan:
1. Add `pdfkit` runtime dependency.
2. Add `@types/pdfkit` dev dependency for TypeScript typing.

### Step 2 - Archive service implementation

File:
- `MuseBar/backend/src/models/archiveService.ts`

Plan:
1. Refactor content pipeline to support `string | Buffer`.
2. Implement real `convertToPDF(...)` with `pdfkit`.
3. Keep existing JSON/XML/CSV behavior unchanged.
4. Update archive verification read path to binary-safe mode.

### Step 3 - Regression tests

File:
- `MuseBar/backend/src/models/archiveService.generateExportContent.test.ts`

Plan:
1. Add a PDF test asserting:
   - result is `Buffer`,
   - output starts with `%PDF`,
   - output size is non-trivial.

### Step 4 - Verify

Run:
- targeted archive model tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. `PDF` export path produces a valid PDF binary (not placeholder text).
2. Archive integrity verification remains correct for PDF files.
3. Regression tests fail if PDF export regresses to placeholder behavior.
