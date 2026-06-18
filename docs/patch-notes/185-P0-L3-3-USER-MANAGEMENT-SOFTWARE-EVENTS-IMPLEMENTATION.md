# 185 - P0-L3.3 (User Management Software Events) - Implementation

Date: 2026-04-30  
Related plan: `docs/patch-notes/184-P0-L3-3-USER-MANAGEMENT-SOFTWARE-EVENTS-PLAN.md`

## What was implemented

L3.3 extends software-event journaling to security-sensitive user-management mutations in `authRegister` routes.

---

## 1) Extended software-event type catalog

Updated:
- `MuseBar/backend/src/services/legal/softwareEventJournal.ts`

Added event types:
- `ESTABLISHMENT_USER_CREATED`
- `ESTABLISHMENT_USER_DELETED`
- `USER_PERMISSIONS_UPDATED`
- `USER_ROLE_UPDATED`

Result:
- User-management mutation hooks now use first-class, typed event names.

---

## 2) Wired user-management mutation routes

Updated:
- `MuseBar/backend/src/routes/authRegister.ts`

Added software-event journaling (best effort) on successful paths:

1. `POST /api/auth/users/:id/permissions`
   - event: `USER_PERMISSIONS_UPDATED`
   - data: target user id, permission count, method (`POST`).

2. `PUT /api/auth/users/:id/permissions`
   - event: `USER_PERMISSIONS_UPDATED`
   - data: target user id, permission count, method (`PUT`).

3. `POST /api/auth/users`
   - event: `ESTABLISHMENT_USER_CREATED`
   - data: target user id, email, role.

4. `DELETE /api/auth/users/:id`
   - event: `ESTABLISHMENT_USER_DELETED`
   - data: target user id.

5. `PUT /api/auth/users/:id/role`
   - event: `USER_ROLE_UPDATED`
   - data: target user id, role.

All hooks are establishment-scoped and actor-attributed (`userId` from authenticated caller).

---

## 3) Added regression tests

Added:
- `MuseBar/backend/src/routes/authRegister.softwareEvents.test.ts`

Coverage:
- permissions update route triggers `USER_PERMISSIONS_UPDATED`.
- role update route triggers `USER_ROLE_UPDATED`.
- establishment user creation route triggers `ESTABLISHMENT_USER_CREATED`.
- establishment user deletion route triggers `ESTABLISHMENT_USER_DELETED`.

Tests run route handlers with mocked auth/user/audit/service dependencies and assert event payloads.

---

## Verification run

Executed in `MuseBar/backend`:

1. `npm run test -- src/routes/authRegister.softwareEvents.test.ts` ✅
   - Result: 1 file passed, 4 tests passed.

2. `npm run type-check` ✅
   - Result: TypeScript no-emit check passed.

3. Lints check (edited files) ✅
   - No linter errors on:
     - `services/legal/softwareEventJournal.ts`
     - `routes/authRegister.ts`
     - `routes/authRegister.softwareEvents.test.ts`
     - `184-P0-L3-3-...-PLAN.md`

---

## Outcome

L3.3 is implemented for user-management mutations:

- critical RBAC/user account changes now emit software-event legal-journal entries,
- hooks are regression-tested,
- API behavior remains unchanged.

## Suggested next increment (L3.4)

- Establishment status/subscription transitions (`active/suspended/...`) software events,
- optional time-configuration / timezone-change software events.
