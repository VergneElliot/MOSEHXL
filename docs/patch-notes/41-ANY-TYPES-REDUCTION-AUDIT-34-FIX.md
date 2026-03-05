# Fix: Reduce `any` Types (Audit #34)

This doc explains **why** widespread use of `any` is a problem, **what** we changed across hooks, services, and components to use proper types, and **how** to keep type safety when adding or changing code.

---

## 1. Why is `any` a problem?

TypeScript’s **`any`** disables type checking for that value. The compiler and your IDE no longer catch:

- Typos (e.g. `user.emial` instead of `user.email`)
- Wrong types (e.g. passing a string where a number is expected)
- Missing or renamed properties after API or type changes

So you lose the main benefit of TypeScript: **static safety**. With ~30+ `any` usages across hooks, services, and models—where proper types already existed or could be inferred—the codebase was riskier to change and refactor.

---

## 2. What we changed

We replaced `any` with concrete types or `unknown` (with proper narrowing) in the following areas. We did **not** change test utilities, mocks, or performance observers where `any` is acceptable for generic helpers or browser APIs.

### 2.1 Closure (hooks, components, API types)

- **types/api.ts**
  - **ClosureTodayStatus** — Updated to match backend `GET /api/legal/closure/today-status` (`date`, `has_closure`, `closure_status`, `bulletin`, `compliance_note`).
  - **LiveMonthlyStats** — Added optional fields used by the UI (`avg_daily_amount`, `avg_daily_transactions`, `closure_count`).
- **useClosureState.ts** — `todayStatus`, `closureSettings`, `monthlyStats` state and setters now use `ClosureTodayStatus | null`, `Record<string, string>`, and `LiveMonthlyStats | null` instead of `any`.
- **useClosureAPI.ts** — `updateClosureSettings` and setters use `Record<string, string>`; removed `any` and `ClosureSettings` where a simple key-value map is enough.
- **ClosureStatusCards.tsx** — Props use `ClosureTodayStatus | null` and `LiveMonthlyStats | null`; display logic uses `has_closure` and `bulletin` (aligned with API).
- **ClosureContainer.tsx** — Bulletin handlers use `Parameters<typeof actions.setSelectedBulletin>[0]` (i.e. `ClosureBulletin`) instead of `any`; removed unsafe `as any` on `todayStatus` and `monthlyStats`.

### 2.2 Auth and App

- **Login.tsx** — `onLogin` and login response `user` use type **User** from `types`; `err` in `catch` is **unknown**, with `err instanceof Error` for message.
- **App.tsx** — `handleLogin` parameter typed as **User**; `user!` when passing to `AppRouter` / `SystemAdminRouter` (narrowed by auth route).
- **AppRouter.tsx** — `AppRouterProps.user` typed as **User**.
- **SystemAdminRouter.tsx** — `user` prop typed as **User**.

### 2.3 API and services

- **apiService.ts** — `post` and `put` body parameter changed from `data?: any` to **`data?: unknown`**.
- **usePermissions.ts** — `apiService.get` response typed as **`{ permissions: string[] }`** instead of `any`.
- **setupService.ts** — `catch (error: unknown)` and safe access to `response?.data?.error` via type assertion.

### 2.4 History and POS

- **useHistoryState.ts** — `currentReceipt` and setter use **Order | null**; **BusinessDayPeriod** interface and `HistoryStats.businessDayPeriod` use **BusinessDayPeriod | null** instead of `any`.
- **useHistoryAPI.ts** — `catch (error: unknown)`; error message from `err` via type assertion for axios-like shape.
- **usePOSAPI.ts** — All `catch (error: unknown)`; error message via same assertion pattern.

### 2.5 Other hooks and components

- **useEstablishments.ts** — `catch (err: unknown)` and `err instanceof Error` for message.
- **HappyHourForm.tsx** — `handleDiscountTypeChange` uses **SelectChangeEvent<'fixed' | 'percentage'>** instead of `any`.

### 2.6 Left as-is (for now)

- **Test and mock code** — `mockGenerators`, `mockServices`, `testHelpers`, `customMatchers`, `setupTests` still use `any` for generic overrides or console mocks.
- **Form validation** — `value: any` in validators and `useFormValidation` (generic field values).
- **Performance / observers** — `(performance as any).memory`, `(entry as any).initiatorType` for non-standard or draft APIs.
- **Some UI props** — e.g. `color as any` for MUI where type is string but value is valid; can be tightened later.

---

## 3. How to keep type safety

- **Prefer existing types** — Use types from `types/` (e.g. `User`, `Order`, `ClosureBulletin`, `ClosureTodayStatus`) instead of `any` when the value matches.
- **Use `unknown` for catch and opaque data** — For `catch (e)` or API payloads you don’t trust, use **unknown** and narrow with `instanceof Error` or type guards / assertions.
- **Infer from existing code** — Use **Parameters<typeof fn>[0]** or **ReturnType<typeof fn>** when the type is already defined by another function or hook.
- **Add types when you touch code** — When changing a function or hook that still uses `any`, introduce a proper type or interface and use it.

---

## 4. Summary

| Area        | Before              | After (examples)                                      |
|------------|---------------------|--------------------------------------------------------|
| Closure    | `any` state, `as any` props | `ClosureTodayStatus`, `LiveMonthlyStats`, `Record<string, string>`, inferred bulletin type |
| Auth/App   | `user: any`         | **User** from types                                    |
| API body   | `data?: any`        | **unknown**                                            |
| Permissions| `get<any>`          | **`get<{ permissions: string[] }>`**                  |
| History    | `currentReceipt: any`, `businessDayPeriod: any` | **Order \| null**, **BusinessDayPeriod \| null** |
| Errors     | `catch (err: any)`  | **unknown** + narrowing or assertion                   |

**Takeaway:** Use concrete types from `types/` or inferred types instead of `any`; use **unknown** and narrow in catch blocks and for untrusted data. This keeps the benefits of TypeScript and makes refactors and API changes safer.
