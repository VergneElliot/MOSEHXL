# MOSEHXL — Documentation Hub

Welcome to the MOSEHXL project documentation. This is your central reference for understanding every piece of this project, from the fundamentals of the technologies used to the detailed patch notes of every fix applied.

The documentation is organized into two sections:

- **Course** — A progressive learning guide that teaches you every aspect of the project, from basic concepts to advanced legal compliance. Start here if you are new.
- **Patch Notes** — A chronological log of every fix and improvement made to the codebase after the initial audit. Each entry explains what was wrong, why it mattered, and exactly what was changed.

For **current live status**, prioritize `DEVELOPMENT-STATE.md` and the latest `docs/patch-notes/` entries. Some course chapters include historical snapshots for teaching context.

---

## Course — Learning Guide

These chapters are designed to be read in order. Each one builds on the previous, taking you from "what is JavaScript?" all the way to "how does French legal compliance work in this specific codebase?"

| # | File | What You'll Learn |
|---|------|-------------------|
| 01 | [Fundamentals](./course/01-FUNDAMENTALS.md) | TypeScript, Node.js, npm — the building blocks of modern web development |
| 02 | [Architecture Overview](./course/02-ARCHITECTURE.md) | Why the project is structured the way it is, what each folder does, how data flows from a user's click to the database and back |
| 03 | [Backend Deep Dive](./course/03-BACKEND-DEEP-DIVE.md) | Express.js, middleware, routes, models, services — how the API works |
| 04 | [Frontend Deep Dive](./course/04-FRONTEND-DEEP-DIVE.md) | React, components, hooks, state management, Material-UI — how the UI works |
| 05 | [Database](./course/05-DATABASE.md) | PostgreSQL, tables, SQL, indexes, migrations — how data is stored and evolved |
| 06 | [Auth and Security](./course/06-AUTH-AND-SECURITY.md) | JWT, bcrypt, CORS, rate limiting — how users are authenticated and the system is protected |
| 07 | [Legal Compliance](./course/07-LEGAL-COMPLIANCE.md) | Hash chains, ISCA pillars, French law — how the legal system works technically |
| 08 | [Audit & Full Course](./course/08-AUDIT-AND-FULL-COURSE.md) | Code audit results, architecture assessment, and a complete file-by-file walkthrough |
| 09 | [Database Architecture Compatibility](./course/09-DATABASE-ARCHITECTURE-COMPATIBILITY.md) | Historical compatibility baseline + migration-first verification checklist for current environments |
| 10 | [Multi-Tenant and Muse POS Access](./course/10-MULTI-TENANT-AND-MUSE-POS-ACCESS.md) | How user–establishment links work; how to log in to Muse POS; script to fix lost links |

---

## Patch Notes — Fixes & Improvements

These are organized chronologically. Each entry corresponds to one specific issue found during the code audit, explains the problem in depth, and documents the fix. They are grouped by category below for easier navigation, but numbered in the order they were applied.

> **Index scope note:** this table is a curated index, not an exhaustive live
> listing of every patch note file in `docs/patch-notes/`. For complete history,
> browse the folder directly and prioritize the most recent entries.

### Security Fixes

| # | File | Summary |
|---|------|---------|
| 11 | [Hardcoded Secrets](./patch-notes/11-SECURITY-HARDCODED-SECRETS-FIX.md) | Removed hardcoded JWT, database, and archive secrets — app now fails fast if secrets are missing from environment |
| 12 | [Invitation Token Leak](./patch-notes/12-SECURITY-INVITATION-TOKEN-LEAK-FIX.md) | Stopped returning raw invitation tokens in API responses |
| 13 | [Env Files in Git](./patch-notes/13-SECURITY-ENV-FILES-NOT-TRACKED.md) | Removed .env files from version control and added them to .gitignore |
| 14 | [SQL Injection](./patch-notes/14-SECURITY-SQL-INJECTION-FIX.md) | Fixed unsafe schema/column name interpolation with whitelist validation |
| 16 | [SQL Keyword Stripping](./patch-notes/16-SECURITY-SQL-KEYWORD-STRIPPING-FIX.md) | Removed harmful SQL keyword stripping that corrupted data — parameterized queries are the real defense |
| 19 | [Unauthenticated Endpoints](./patch-notes/19-SECURITY-UNAUTHENTICATED-ENDPOINTS-FIX.md) | Added auth middleware to email-test and admin-dashboard routes |
| 28 | [Debug Info Leaked on Login](./patch-notes/28-DEBUG-INFO-LEAKED-LOGIN-FIX.md) | Removed debug Alert showing backend URL and init status to all users |
| 38 | [Case Sensitivity Auth Directory](./patch-notes/38-CASE-SENSITIVITY-AUTH-DIRECTORY-FIX.md) | Unified to lowercase `auth/` directory for cross-platform compatibility |
| 45 | [Math.random Request IDs](./patch-notes/45-MATH-RANDOM-REQUEST-IDS-AUDIT-38-FIX.md) | Replaced predictable Math.random() with crypto.randomUUID() for request IDs |
| 46 | [X-Powered-By Removal](./patch-notes/46-X-POWERED-BY-REMOVAL-AUDIT-39-FIX.md) | Removed X-Powered-By header to prevent server fingerprinting |
| 54 | [Establishment Account API Bypass](./patch-notes/54-ESTABLISHMENT-ACCOUNT-API-BYPASS-AUDIT-47-FIX.md) | Routed establishment account API through the centralized HTTP client for auth and timeout handling |

### Architecture & Code Quality Fixes

| # | File | Summary |
|---|------|---------|
| 15 | [Schema Creation Divergence](./patch-notes/15-SCHEMA-CREATION-DIVERGENCE-FIX.md) | Historical fix that unified schema creation paths during the pre-shared-table phase |
| 20 | [Dual Database Pool](./patch-notes/20-DUAL-DATABASE-POOL-REMOVAL.md) | Removed unused config/database module — single pool in app.ts |
| 21 | [Triple Error Handling](./patch-notes/21-TRIPLE-ERROR-HANDLING-CONSOLIDATION.md) | Merged three error handling systems into one unified AppError hierarchy |
| 22 | [Setup Flow Consolidation](./patch-notes/22-ESTABLISHMENT-SETUP-FLOWS-AND-INVITATION-CONSOLIDATION.md) | Documented the five overlapping setup/invitation flows and consolidated the invitation query |
| 23 | [Password Validation](./patch-notes/23-PASSWORD-VALIDATION-SINGLE-RULE-SET.md) | Consolidated password rules into a single shared utility |
| 29 | [Redundant Standalone Files](./patch-notes/29-REDUNDANT-STANDALONE-FILES-FIX.md) | Removed shim files and duplicate route files; consolidated on directory-based modules |
| 30 | [Redundant Frontend Files](./patch-notes/30-REDUNDANT-FRONTEND-FILES-FIX.md) | Removed 14 frontend shim/barrel files that duplicated directory index exports |
| 31 | [Dead Frontend Modules](./patch-notes/31-DEAD-FRONTEND-MODULES-AND-MIDDLEWARE-FIX.md) | Removed unused skeletons/ and loadingStates/ modules; wired missing middleware |
| 32 | [Dead Code Within Files](./patch-notes/32-DEAD-CODE-WITHIN-FILES-FIX.md) | Removed Mongoose handling, fake PDF generator, unused localStorage methods, dead variables |
| 33 | [Debug Console.log Cleanup](./patch-notes/33-DEBUG-CONSOLE-LOG-AUDIT-25-FIX.md) | Replaced console.log with structured logger (backend) and removed debug logs (frontend) |
| 34 | [Self-HTTP Proxy Fix](./patch-notes/34-SELF-HTTP-PROXY-PRINTING-COMPAT-FIX.md) | Replaced axios-to-self calls in printing compat with direct in-process function calls |
| 48 | [Circular Logger Re-export](./patch-notes/48-CIRCULAR-LOGGER-RE-EXPORT-AUDIT-41-FIX.md) | Broke circular import cycle in logger module by removing re-export from index |
| 43 | [Per-Request Service Instantiation](./patch-notes/43-PER-REQUEST-SERVICE-INSTANTIATION-AUDIT-36-FIX.md) | Changed services from per-request `new` to module-level singletons |
| 56 | [Technical Audit Clean Base & V2 Readiness](./patch-notes/56-TECHNICAL-AUDIT-CLEAN-BASE-AND-V2-READINESS.md) | Migrations (closure tips/change/weekly, users.is_active, rate_limit_store, V1 backfill), single change endpoint, API base URL, dead code removal, single getEstablishmentId/formatDate, README/schema updates |

### Code Deduplication & Type Safety

| # | File | Summary |
|---|------|---------|
| 35 | [Currency Format Deduplication](./patch-notes/35-CURRENCY-FORMAT-DEDUPLICATION-AUDIT-27.md) | Single formatCurrency utility replacing 11 duplicated Euro formatters |
| 36 | [Snackbar Pattern Deduplication](./patch-notes/36-SNACKBAR-PATTERN-DEDUPLICATION-AUDIT-28.md) | Shared useSnackbar hook replacing duplicated success/error/close pattern in 3 hooks |
| 37 | [ClosureBulletin Type Unification](./patch-notes/37-CLOSURE-BULLETIN-TYPE-UNIFICATION-AUDIT-29.md) | Single ClosureBulletin type in types/api.ts replacing 3+ divergent definitions |
| 39 | [React Router Types Fix](./patch-notes/39-REACT-ROUTER-TYPES-AUDIT-32-FIX.md) | Removed stale @types/react-router-dom (v5 types) since v6 ships its own |
| 41 | [Any Types Reduction](./patch-notes/41-ANY-TYPES-REDUCTION-AUDIT-34-FIX.md) | Replaced `any` with proper types in closure, auth, API, history, and POS code |
| 44 | [Empty Catch Blocks](./patch-notes/44-EMPTY-CATCH-BLOCKS-AUDIT-37-FIX.md) | Added error logging to previously silent catch blocks in auth user creation |
| 57 | [Backend Build: Logger & SubBill Fix](./patch-notes/57-BACKEND-BUILD-LOGGER-AND-SUBBILL-FIX.md) | Logger calls fixed to match (message, error, category) signature; payment_method narrowed to 'cash' \| 'card' for SubBill creation |

### Performance Fixes

| # | File | Summary |
|---|------|---------|
| 42 | [N+1 in setUserPermissions](./patch-notes/42-N-PLUS-ONE-SET-USER-PERMISSIONS-AUDIT-35-FIX.md) | Replaced 2N+1 queries with a single INSERT...SELECT in a transaction |
| 47 | [In-Memory Rate Limiting](./patch-notes/47-IN-MEMORY-RATE-LIMITING-AUDIT-40-FIX.md) | PostgreSQL-backed rate limit store so limits survive restarts and work across processes |
| 53 | [Infinite Rerender Loops](./patch-notes/53-INFINITE-RERENDER-LOOPS-AUDIT-46-FIX.md) | Memoized API hook return values to stabilize useEffect dependency arrays |
| 55 | [useAuth 100ms Sleep Hack](./patch-notes/55-USE-AUTH-100MS-SLEEP-AUDIT-48-FIX.md) | Removed arbitrary sleep; gate on apiConfig.isReady() instead |

### Legal Compliance & Multi-Tenancy Fixes

| # | File | Summary |
|---|------|---------|
| 17 | [Legal Journal Multi-Tenancy](./patch-notes/17-LEGAL-JOURNAL-MULTI-TENANCY-FIX.md) | Closure bulletins now scoped per-establishment; scheduler, archive, and routes updated |
| 18 | [Printing and Products Schema](./patch-notes/18-PRINTING-PRODUCTS-SCHEMA-FIX.md) | Historical schema-era fix; current runtime uses shared-table establishment scoping |
| 26 | [Product isActive Hardcoded](./patch-notes/26-PRODUCT-ISACTIVE-HARDCODED-FIX.md) | Products API now uses the real database is_active value instead of hardcoding true |
| 27 | [Double API Call on Mount](./patch-notes/27-DOUBLE-API-CALL-LEGAL-COMPLIANCE-FIX.md) | Fixed duplicate useEffect causing two identical API calls on component mount |
| 40 | [Moment Timezone Strategy](./patch-notes/40-MOMENT-TIMEZONE-AND-TIMEZONE-STRATEGY-AUDIT-33.md) | Single DEFAULT_APP_TIMEZONE constant; configurable closure timezone |

### Database & Migration Fixes

| # | File | Summary |
|---|------|---------|
| 24 | [Migration Chain Fresh DB](./patch-notes/24-MIGRATION-CHAIN-FRESH-DB-FIX.md) | Fixed migrate failing on fresh database by adding setup/status-transitions tables to the migration chain |
| 25 | [Package Lock & Email Templates](./patch-notes/25-PACKAGE-LOCK-AND-EMAIL-TEMPLATES-FIX.md) | Committed lockfile for reproducible builds; added missing invitation email templates |
| 49 | [Schema SQL Files Outdated](./patch-notes/49-SCHEMA-SQL-FILES-OUTDATED-AUDIT-42-FIX.md) | Aligned reference schema.sql files with actual post-migration database state |
| 51 | [Orphan Migration SQL Files](./patch-notes/51-ORPHAN-MIGRATION-SQL-FILES-AUDIT-44-FIX.md) | Moved orphan SQL files into the timestamped migration chain |
| 52 | [Migration CLI Filename Format](./patch-notes/52-MIGRATION-CLI-FILENAME-FORMAT-AUDIT-45-FIX.md) | Fixed createMigration() to generate correct YYYY_MM_DD_HH_MM_SS filenames |

### CI/CD & DevOps

| # | File | Summary |
|---|------|---------|
| 50 | [CI/CD Pipeline Issues](./patch-notes/50-CICD-PIPELINE-ISSUES-AUDIT-43-FIX.md) | Fixed deploy step, performance job paths, Lighthouse config, and GitHub Actions versions |

### Session Summaries

| File | Summary |
|------|---------|
| [Session Summary for Successor](./patch-notes/SESSION-SUMMARY-FOR-SUCCESSOR.md) | Handoff document covering the initial audit, all fixes applied, and remaining work |
| [Session Summary: POS Tax, Payment & Cleanup](./patch-notes/SESSION-SUMMARY-POS-TAX-PAYMENT-AND-CLEANUP.md) | TTC tax model fix, exact tax storage, cash/card only payment, three payment buttons, migrations, code cleanup |

---

## Where to Start

- **Complete beginner?** Start with [Chapter 01 — Fundamentals](./course/01-FUNDAMENTALS.md) and work through in order.
- **Want the big picture?** Read [Chapter 02 — Architecture Overview](./course/02-ARCHITECTURE.md).
- **Need to understand a specific fix?** Use the categorized patch notes list above.
- **Setting up the project?** See the [root README](../README.md) for quick start instructions.
- **Checking development status?** See [DEVELOPMENT-STATE.md](../DEVELOPMENT-STATE.md) for current completion state and active priorities.
