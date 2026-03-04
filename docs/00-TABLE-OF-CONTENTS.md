# MOSEHXL — Learning Guide

This is your personal reference for understanding every piece of this project.
Each chapter is self-contained. Read them in order, or jump to whatever you need.

## Chapters

| # | File | What You'll Learn |
|---|------|-------------------|
| 01 | [Fundamentals](./01-FUNDAMENTALS.md) | TypeScript, Node.js, npm — the building blocks |
| 02 | [Architecture Overview](./02-ARCHITECTURE.md) | Why the project is structured the way it is, what each folder does, how data flows from click to database and back |
| 03 | [Backend Deep Dive](./03-BACKEND-DEEP-DIVE.md) | Express.js, middleware, routes, models, services — how the API works |
| 04 | [Frontend Deep Dive](./04-FRONTEND-DEEP-DIVE.md) | React, components, hooks, state management, Material-UI — how the UI works |
| 05 | [Database](./05-DATABASE.md) | PostgreSQL, tables, SQL, indexes, migrations — how data is stored |
| 06 | [Auth and Security](./06-AUTH-AND-SECURITY.md) | JWT, bcrypt, CORS, rate limiting — how users are authenticated and protected |
| 07 | [Legal Compliance](./07-LEGAL-COMPLIANCE.md) | Hash chains, ISCA pillars, French law — how the legal system works technically |
| 08 | [Audit & Full Course](./08-AUDIT-AND-FULL-COURSE.md) | Code audit, redundant code, architecture assessment, and complete file-by-file course for developers |
| 09 | [Database Architecture Compatibility](./09-DATABASE-ARCHITECTURE-COMPATIBILITY.md) | What the DB must have for current code; migration CLI vs reference schemas; verification queries |
| 10 | [Multi-tenant and Muse POS access](./10-MULTI-TENANT-AND-MUSE-POS-ACCESS.md) | How user–establishment links work; how to log in to Muse POS; script to fix lost links |
| 11 | [Security: Hardcoded secrets fix](./11-SECURITY-HARDCODED-SECRETS-FIX.md) | Why hardcoded JWT/DB/archive secrets are dangerous and how they were removed |
| 12 | [Security: Invitation token leak fix](./12-SECURITY-INVITATION-TOKEN-LEAK-FIX.md) | Why invitation tokens must not be returned in API responses and how it was fixed |
| 13 | [Security: Env files not tracked](./13-SECURITY-ENV-FILES-NOT-TRACKED.md) | Why .env.development/.production must not be in Git and how they were untracked |
| 14 | [Security: SQL injection fix](./14-SECURITY-SQL-INJECTION-FIX.md) | Why schema/column interpolation is dangerous and how we validate or whitelist |
| 15 | [Schema creation divergence fix](./15-SCHEMA-CREATION-DIVERGENCE-FIX.md) | Why two schema creators broke the POS and how we unified on SchemaManager |
| 16 | [Security: SQL keyword stripping fix](./16-SECURITY-SQL-KEYWORD-STRIPPING-FIX.md) | Why stripping SQL keywords corrupts data and doesn’t protect; rely on parameterized queries |
| 17 | [Legal journal multi-tenancy fix](./17-LEGAL-JOURNAL-MULTI-TENANCY-FIX.md) | Why closure bulletins must be per-establishment and how scheduler, archive, and routes were updated |
| 18 | [Printing and products schema fix](./18-PRINTING-PRODUCTS-SCHEMA-FIX.md) | Why printing/products must query the establishment schema and how routes and models were updated |
| 19 | [Security: Unauthenticated endpoints fix](./19-SECURITY-UNAUTHENTICATED-ENDPOINTS-FIX.md) | Why every sensitive endpoint must use auth middleware and how email-test and admin-dashboard routes were secured |
| 20 | [Dual database pool removal](./20-DUAL-DATABASE-POOL-REMOVAL.md) | Why we removed the unused config/database module and keep a single pool in app.ts |
| 21 | [Triple error handling consolidation](./21-TRIPLE-ERROR-HANDLING-CONSOLIDATION.md) | Why we merged to one error hierarchy, one asyncHandler, and one global handler |
| 22 | [Establishment/setup flows and invitation consolidation](./22-ESTABLISHMENT-SETUP-FLOWS-AND-INVITATION-CONSOLIDATION.md) | Five overlapping flows (#12), single invitation query (#13), and how to evolve |
| 23 | [Password validation single rule set](./23-PASSWORD-VALIDATION-SINGLE-RULE-SET.md) | Why one password policy everywhere and how we consolidated to utils/passwordValidation |
| 24 | [Migration chain broken on fresh DB](./24-MIGRATION-CHAIN-FRESH-DB-FIX.md) | Why migrate failed on fresh DB and how we moved setup/status-transitions into the timestamped chain |
| 25 | [package-lock and email templates](./25-PACKAGE-LOCK-AND-EMAIL-TEMPLATES-FIX.md) | Why lockfile must be committed (CI/reproducible builds) and why missing invitation templates threw at runtime |
| 26 | [Product isActive hardcoded](./26-PRODUCT-ISACTIVE-HARDCODED-FIX.md) | Why products API hardcoded isActive: true and how we use the real DB value and persist it on update |
| 27 | [Double API call on mount (legal compliance)](./27-DOUBLE-API-CALL-LEGAL-COMPLIANCE-FIX.md) | Why two identical useEffects caused double fetches and how we keep a single load-on-mount effect |
| 28 | [Debug info leaked on login](./28-DEBUG-INFO-LEAKED-LOGIN-FIX.md) | Why backend URL/host/init status must not be shown to all users and how we removed the debug Alert |
| 29 | [Redundant standalone vs directory files](./29-REDUNDANT-STANDALONE-FILES-FIX.md) | Why shim files and duplicate route files were removed and how we consolidated establishments |
| — | [Session summary: POS tax, payment, cleanup](./SESSION-SUMMARY-POS-TAX-PAYMENT-AND-CLEANUP.md) | Handoff: TTC tax fix, exact tax storage, cash/card only, three payment buttons, migrations, code cleanup |
