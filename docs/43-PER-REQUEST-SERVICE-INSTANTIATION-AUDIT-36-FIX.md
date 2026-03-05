# Fix: Per-Request Service Instantiation (Audit #36)

This doc explains **why** instantiating stateless services on every request is wasteful, **what** we changed (module-level singletons for DashboardDataService, EstablishmentService, EstablishmentCreationOrchestrator), and **how** to decide when to use a shared instance vs a new one per request.

---

## 1. What was the problem?

In the backend route handlers, three services were created **inside** the request handler, so a **new instance** was allocated for **every** HTTP request that hit those routes:

| File | Service | Where it was created |
|------|---------|----------------------|
| `routes/adminDashboard.ts` | `DashboardDataService` | Inside `GET /metrics` handler: `const dashboardService = new DashboardDataService(logger)` |
| `routes/enhancedEstablishments.ts` | `EstablishmentService` | Inside `GET /`, `GET /:id`, and `DELETE /:id` handlers (three places) |
| `routes/enhancedEstablishments.ts` | `EstablishmentCreationOrchestrator` | Inside `POST /` handler |

These services are **stateless**: they only hold a logger (and in the orchestrator’s case, config and sub-services that are also stateless). They do not store request-specific data. So there was **no need** to create a new instance per request — the same instance can safely serve all requests.

### Why this is bad

- **Allocation churn:** Each request allocates new objects (and the orchestrator allocates several sub-services). Under load this increases GC pressure and CPU.
- **No benefit:** Because the services don’t hold per-request state, creating them per request doesn’t improve correctness or isolation; it only adds cost.
- **Consistency:** Other parts of the codebase (e.g. `EmailService.getInstance()`) already use shared instances for stateless services. Per-request instantiation here was inconsistent and unnecessary.

So we had **avoidable overhead** and **inconsistent** patterns.

---

## 2. Core concepts

### 2.1 Stateless vs stateful services

A **stateless** service does not hold data that depends on the current request or user. Its methods take all inputs as arguments and use only shared resources (DB pool, logger, config). It’s safe to use **one instance** for the whole process.

A **stateful** service holds request- or user-specific data (e.g. “current user ID,” “current request ID”). You typically create **one instance per request** (or per scope) so that one request doesn’t see another’s state.

**How to tell:** Look at the class’s fields and constructor. If it only injects things like logger, config, DB pool, or other stateless services, it’s stateless. If it sets or reads fields that represent “this request” or “this user,” it’s stateful.

### 2.2 Singleton / module-level instance

A **singleton** is a single shared instance of a class for the lifetime of the process. In Node/Express you can achieve this by:

- Creating the instance **once** at **module load** (top-level in the route file or a dedicated service module), and
- Using that same instance in every request handler.

Because Node runs one process and route modules are loaded once, a top-level `const service = new MyService(logger)` creates exactly one instance. Every request that uses `service` gets the same object. That’s correct when the service is stateless.

**When to use:** Use a shared instance (singleton/module-level) when the service is stateless and safe to reuse across requests. Use a new instance per request when the service is stateful or when you explicitly need isolation (e.g. per-request caches or request-scoped context).

### 2.3 Per-request instantiation

Creating `new MyService(...)` **inside** a route handler means every request gets its own instance. That’s appropriate when:

- The service holds request-specific state, or
- You need strict isolation (e.g. testing, or request-scoped transactions stored on the service).

It’s **not** necessary when the service only holds a logger and config and uses the global pool — in that case a single instance is simpler and cheaper.

---

## 3. What we changed

**Files:** `MuseBar/backend/src/routes/adminDashboard.ts` and `MuseBar/backend/src/routes/enhancedEstablishments.ts`.

| Location | Before | After |
|----------|--------|--------|
| `adminDashboard.ts` | `const dashboardService = new DashboardDataService(logger)` inside `GET /metrics` | `const dashboardService = new DashboardDataService(logger)` at **module level** (once); handler uses that `dashboardService` |
| `enhancedEstablishments.ts` | `new EstablishmentService(logger)` inside each of GET `/`, GET `/:id`, DELETE `/:id` | One `const establishmentService = new EstablishmentService(logger)` at **module level**; all three handlers use it |
| `enhancedEstablishments.ts` | `new EstablishmentCreationOrchestrator(logger)` inside `POST /` | One `const establishmentCreationOrchestrator = new EstablishmentCreationOrchestrator(logger)` at **module level**; POST handler uses it |

**Behaviour:** Unchanged. The services remain stateless; only the **number of instances** and **when** they are created changed (once at load instead of once per request).

**Naming:** In the POST handler the variable was previously `establishmentCreationService`; it now uses the module-level `establishmentCreationOrchestrator` directly (no local variable).

---

## 4. How to verify

- **Functionally:** Call the same endpoints as before (dashboard metrics, list/get/delete establishments, create establishment). Responses and behaviour should be identical.
- **Load:** Under concurrent requests, you can compare memory/CPU before and after; you should see less allocation and GC activity for these routes.
- **Code review:** Confirm no route handler stores request-specific data on the service (none do); then a shared instance is correct.

---

## 5. Summary

| Topic | Takeaway |
|--------|----------|
| **Stateless services** | If a service only holds logger, config, pool, or other stateless deps, one instance per process is enough. |
| **Singleton / module-level** | Create the instance once at top-level and reuse in handlers; avoids per-request allocation and matches patterns like `EmailService.getInstance()`. |
| **Per-request instantiation** | Use when the service is stateful or needs request-scoped isolation; don’t use by default for stateless logic. |
| **Audit #36** | DashboardDataService, EstablishmentService, and EstablishmentCreationOrchestrator are now instantiated once per process in their route modules instead of once per request. |

**Audit #36:** Per-request service instantiation — fixed by moving to module-level (singleton) instances for these stateless services.
