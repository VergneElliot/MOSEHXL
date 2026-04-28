# MOSEHXL — Full Repo State Audit (Hard Copy)

Date: 2026-04-23  
Scope: Entire repository (`/home/zone01student/Projects/MOSEHXL`)  
Purpose: Permanent, versioned snapshot of the "hard truth" audit after phases A-D.

---

## Executive verdict

You made major progress and shipped many core remediations, but the repo is **not yet in a state where we can honestly claim full production-grade fiscal compliance** for a sellable French multi-tenant POS.

The architecture direction is solid (RLS, per-establishment legal journal model, token blocklist, permission middleware hardening), but there are still critical gaps and newly discovered defects that must be fixed before moving deeper into user-system and printing features.

---

## Current status against A1-D4

| Phase | Goal | Status | Verdict |
|---|---|---|---|
| A1 | Lock `POST /api/auth/setup` | Implemented | Done |
| A2 | Role / `is_admin` collapse | Partial | Role normalization exists, but legacy fallback and role drift remain |
| A3 | Per-establishment legal/audit/archive surfaces | Partial | Journal chain improved; DB constraints/schema consistency still incomplete |
| A4 | Enforce backend permissions | Partial | Applied in many routes, not all critical ones |
| B1 | Shared-table + RLS | Implemented | Done |
| B2 | Tenant leak closure | Implemented | Done (with minor residual dead files) |
| B3 | Printing tables in migration chain | Implemented | Done |
| B4 | Receipt fields sourced from journal/tax model | Implemented | Done |
| C1 | Dead/legacy code removal | Partial | Significant cleanup done; leftovers remain |
| C2 | Error handling consolidation | Not complete | Empty catches and inconsistent patterns remain |
| C3 | Type-safety parse failure logging | Implemented | Done |
| C4 | Documentation truth alignment | Partial | README still overstates some claims |
| C5 | Testing posture hardening | Partial | Better than before, still thin for fiscal-critical flows |
| D1 | JWT revocation lifecycle | Partial | Revocation exists; refresh/start flows still leave old tokens alive |
| D2 | Strict permission middleware semantics | Implemented | Done |
| D3 | Epson key via header | Implemented | Done |
| D4 | Shared types/workspace hygiene | Partial | Package exists, but not yet true full single source of truth |

---

## Critical blockers discovered in this audit

These are blockers that should be fixed before claiming compliance or moving to major new features.

1. **Legal journal insert query defect (critical)**
   - In `backend/src/models/legalJournal/journalQueries.ts`, `insertEntry()` uses 14 SQL placeholders for 13 inserted columns and 13 bound values.
   - This can make legal journal writes fail while order creation still succeeds (because some callers treat journal failure as non-blocking).
   - Impact: fiscal trail integrity risk.

2. **Setup audit writer schema mismatch (critical)**
   - `backend/src/services/setup/wizard/SetupAuditManager.ts` writes audit columns that do not match the canonical `audit_trail` schema used elsewhere.
   - Impact: setup audit path can silently fail / become non-authoritative.

3. **Error-handling inconsistency in core order CRUD (high)**
   - `backend/src/routes/orders/orderCRUD.ts` still contains empty `catch {}` blocks with generic responses and no structured error propagation.
   - Impact: weak observability + behavior drift vs C2 goals.

---

## Legal compliance truth (CGI 286-I-3 bis / NF525 posture)

### What is now strong
- Shared-table multi-tenancy with RLS is in place.
- Legal journal model is tenant-aware at the query level.
- Closure bulletins and archives are now much better aligned with per-establishment logic.
- Security/audit architecture is materially improved compared to pre-remediation state.

### What still prevents a clean compliance claim
- Fiscal write-path reliability is not yet strict enough (journal write failure handling).
- Missing full "software event journal" style coverage expected by strict interpretation of fiscal control workflows.
- Invoice/receipt subsystem remains incomplete for advanced legal scenarios (distinct numbering and full invoice workflow readiness).
- Some DB constraints and route-level guarantees remain partial.

**Bottom line:** compliance posture is **PARTIAL** for implemented scope, not "fully compliant".

---

## Security hardening truth (excluding A5 host hardening)

### Fixed / improved
- Setup secret protection added.
- JWT revocation blocklist implemented.
- Permission middleware semantics tightened (no implicit `system_admin` bypass in the strict permission checks).
- Epson poll key moved to secure header-first transport.

### Still open
- CORS and API exposure posture still needs final tightening in app runtime config.
- Swagger/docs and client-error ingestion routes need stricter production gating.
- Token lifecycle hardening is incomplete (`refresh`/session rotation behavior still leaves risk windows).
- Some route families remain protected only by broad auth and not strict permission gates.

---

## Code quality and architecture truth

### Good progress
- Real dead code cleanup has happened.
- Shared types package exists and is consumed.
- Modular structure is much better than the original state.

### Remaining drift
- "Single source of truth" is not fully achieved yet (types and role vocabulary still have parallel definitions/legacy mappings).
- Some legacy/unused files are still present and can become future footguns.
- Error-handling standardization is incomplete.
- Test coverage remains insufficient for a fiscal-critical platform.

---

## Priority execution plan (start here tomorrow)

### P0 (must-do immediately)
1. Fix legal journal `insertEntry()` SQL/value mismatch.
2. Make legal journal write path transactional or fail-safe by policy (no silent fiscal write loss).
3. Fix or remove `SetupAuditManager` to match canonical audit schema.
4. Finish C2 in `orderCRUD` and other core routes (remove empty catches, enforce centralized error flow).

### P1 (next stabilization pass)
5. Complete A3 constraints hardening (`NOT NULL`/uniqueness where planned but not yet enforced).
6. Close remaining A4 route permission gaps.
7. Tighten D1 token lifecycle around refresh/session rotation.

### P2 (before broad feature expansion)
8. Final CORS/docs/client-error production hardening alignment.
9. Remove or quarantine remaining legacy/dead files.
10. Expand integration tests for legal chain, tenant isolation, auth/permissions, and printing critical paths.

---

## Recommended claim language (safe and honest)

Until P0/P1 is complete, use this position:

> "MOSEHXL is in advanced pre-certification hardening for French fiscal compliance, with major ISCA architecture now implemented (tenant isolation, legal journaling model, closure and archive foundations), and final stabilization work in progress before formal certification positioning."

---

## Companion artifact

A structured visual audit canvas was also generated for this same assessment:

- `~/.cursor/projects/home-zone01student-Projects-MOSEHXL/canvases/repo-state-audit.canvas.tsx`

Use this markdown file as the canonical handoff snapshot in git, and the canvas for rapid visual review.
