# 219 - P1-Q7 (Role vocabulary boundary) - Implementation

Date: 2026-04-30  
Plan reference: `docs/patch-notes/218-P1-Q7-ROLE-VOCABULARY-BOUNDARY-PLAN.md`

## What was implemented

This patch closes P1-Q7 by documenting and centralizing role vocabulary
boundaries between auth runtime roles, user-management role templates, and
invitation role labels.

## 1) Centralized role vocabulary helper

New:
- `MuseBar/backend/src/auth/roleVocabulary.ts`
- `MuseBar/backend/src/auth/roleVocabulary.test.ts`

Added:
1. Canonical auth role constants/types:
   - `system_admin`, `establishment_admin`, `staff`
2. User-management template role ids:
   - `admin`, `manager`, `staff`, `cashier`
3. Invitation role labels:
   - `establishment_admin`, `establishment_manager`, `establishment_staff`
4. Shared helper functions:
   - `normalizeCanonicalRole(...)`
   - `deriveCanonicalRole(...)`
   - `mapInvitationRoleLabelToCanonicalRole(...)`

Result:
- one source for role normalization semantics,
- explicit boundary between runtime auth roles and legacy management/invitation vocabularies.

## 2) Auth route now consumes shared canonical mapping

Updated:
- `MuseBar/backend/src/routes/authLogin.ts`

Changes:
1. Removed local duplicated role-normalization functions.
2. Imported `CanonicalAuthRole` + `deriveCanonicalRole` from shared helper.
3. Login/refresh role derivation now uses shared logic.

Result:
- auth role normalization is centralized and testable in one place.

## 3) Invitation flows now consume shared invitation role semantics

Updated:
- `MuseBar/backend/src/routes/userManagement/invitationRoutes.ts`
- `MuseBar/backend/src/services/userInvitation/invitationValidator.ts`
- `MuseBar/backend/src/services/userInvitation/invitationAcceptance.ts`
- `MuseBar/backend/src/services/userInvitation/types.ts`

Changes:
1. Invitation route validation uses `INVITATION_ROLE_LABELS`.
2. Invitation validator uses the same shared list (replacing stale hard-coded
   `cashier/manager/supervisor` list).
3. Invitation acceptance user-role assignment uses
   `mapInvitationRoleLabelToCanonicalRole(...)` when creating user accounts.
4. UserInvitation `UserRole` type now reflects invitation label vocabulary.

Result:
- invitation role acceptance/validation is consistent and explicitly normalized to canonical auth roles.

## 4) User-management template roles explicitly typed/documented

Updated:
- `MuseBar/backend/src/routes/userManagement/roles/rolePermissions.ts`

Changes:
1. `DEFAULT_ROLES` now typed with `UserManagementTemplateRoleId`.
2. Added explicit comment that these are role templates (not JWT runtime roles).
3. Added safe key guard in `getSystemRoleById(...)` for strict typing.

Result:
- template-role semantics are explicit and safer under strict TypeScript.

## 5) Course documentation update

Updated:
- `docs/course/06-AUTH-AND-SECURITY.md`

Added:
- a dedicated section explaining:
  - canonical auth roles,
  - user-management template role ids,
  - invitation role labels and normalization path.

Result:
- the role boundary is documented for maintainers/readers, reducing future confusion.

## Verification

Executed:

1. `npm run test -- src/auth/roleVocabulary.test.ts src/routes/authLogin.loginSessionKick.test.ts src/routes/authLogin.refreshRotation.test.ts src/routes/authLogin.supportImpersonation.test.ts`
   - Result: 4 files passed, 9 tests passed.

2. `npm run type-check`
   - Result: success.

3. Lint diagnostics on touched files
   - Result: no linter errors.

## Outcome

P1-Q7 is complete:
- role-vocabulary boundary is now explicit in both code and docs,
- duplicated role-mapping logic was consolidated,
- invitation and auth flows share the same canonical mapping semantics.
