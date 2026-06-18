# 218 - P1-Q7 (Role vocabulary boundary) - Plan

Date: 2026-04-30  
Source audit: `docs/audits/2026-04-29-full-repo-state-audit-hard-copy.md` (P1-Q7)

## Why this patch exists

Audit P1-Q7 identified parallel role vocabularies:

1. **Auth/runtime roles** (JWT + middleware): `system_admin`, `establishment_admin`, `staff`
2. **User-management template roles**: `admin`, `manager`, `staff`, `cashier`

Additional invitation labels (`establishment_admin`, `establishment_manager`,
`establishment_staff`) were also handled in separate places with ad-hoc arrays.

Without explicit boundaries, this creates maintenance risk and weakens role
semantics clarity.

## Scope

### In scope

1. Centralize role vocabulary constants/mapping helpers in one backend module.
2. Make auth and invitation flows consume the shared helpers.
3. Document role-boundary semantics in course docs and code comments.
4. Add focused tests for mapping behavior.
5. Keep runtime behavior unchanged.

### Out of scope

- Full migration removing legacy user-management template roles.
- Full rewrite of user-management role editor architecture.
- Dropping legacy `is_admin` claim (tracked separately).

## Design choices

1. **Single role vocabulary helper module**
   - Add `backend/src/auth/roleVocabulary.ts` with:
     - canonical auth roles,
     - user-management template role ids,
     - invitation labels,
     - normalization and mapping helpers.

2. **Behavior-preserving adoption**
   - Replace duplicated role arrays/mapping logic with shared helper calls.
   - Do not alter endpoint contracts or existing accepted invitation labels.

3. **Documentation-first clarity**
   - Explicitly document the boundary and normalization path in
     `docs/course/06-AUTH-AND-SECURITY.md`.

## Strategy

### Step 1 - Shared vocabulary helper

File:
- `MuseBar/backend/src/auth/roleVocabulary.ts` (new)

Plan:
1. Define canonical auth role constants/types.
2. Define user-management template role ids.
3. Define invitation role labels.
4. Add normalization helpers used by auth and invitation flows.

### Step 2 - Adopt helper in auth/invitation paths

Files:
- `MuseBar/backend/src/routes/authLogin.ts`
- `MuseBar/backend/src/services/userInvitation/invitationAcceptance.ts`
- `MuseBar/backend/src/services/userInvitation/invitationValidator.ts`
- `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`
- `MuseBar/backend/src/routes/userManagement/roles/rolePermissions.ts`
- `MuseBar/backend/src/services/userInvitation/types.ts`

Plan:
1. Replace local role normalization in auth login with shared helper.
2. Replace invitation-role mapping/validation literals with shared constants.
3. Clarify role-template file comments and typing.

### Step 3 - Tests and docs

Files:
- `MuseBar/backend/src/auth/roleVocabulary.test.ts` (new)
- `docs/course/06-AUTH-AND-SECURITY.md`

Plan:
1. Add mapping regression tests.
2. Add a dedicated explanation section in course docs.

### Step 4 - Verify

Run:
- targeted role vocabulary + invitation/auth tests,
- backend type-check,
- lint diagnostics on touched files.

## Acceptance criteria

1. Role normalization/mapping logic is centralized and reused.
2. Role boundary is explicitly documented (auth roles vs templates vs invitation labels).
3. No behavior regression in auth/invitation role assignment paths.
