# 480 — User profile + establishment calendar color (PLAN)

## Context

Planning calendar colors today are status-based (pending vs confirmed), not per person. Staff want a stable unique color per account within an establishment to make the planning grid readable. Profile fields (name, birthday, phone) belong in Settings.

## Scope

- Schema: `users.phone`, `users.date_of_birth`; `user_establishment_memberships.calendar_color` (unique per establishment)
- Default unique color on membership create; changeable in Settings → Profil
- Optional: first/last name, birthday, phone (pre-existing first/last on users)
- Planning calendar/grid uses `calendar_color`
- Shared palette + uniqueness check

## Approach

1. Migration + backfill colors for existing memberships
2. `calendarColors.ts` palette + allocate next free
3. `MembershipModel.upsert` / ensure color on create paths
4. `GET/PATCH /api/auth/me/profile` (+ used colors for picker)
5. Settings tab **Profil**
6. Planning staff DTO includes color; UI uses it

## Verification

- [ ] Migration up/down
- [ ] Unit tests for palette uniqueness allocation
- [ ] Manual: two users cannot pick same color; planning shows person colors
- [ ] Fiscal: MINOR

## Risks

- Multi-establishment: color is **per membership** (venue), not global account
- Exhausted palette: fall back to generated HSL colors still unique in establishment
