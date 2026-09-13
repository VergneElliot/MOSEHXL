# 500 — Establishments status/tax columns (PLAN)

## Context

System-admin create on production fails with:

`column "status" of relation "establishments" does not exist`

`GET /api/establishments/stats` fails with the same missing-column class (`42703`).

Code (`EstablishmentDataProcessor`, list/stats routes) inserts/selects `status`,
`tva_number`, and `siret_number`, but no migration ever added them to the chain.
Prod only has the older establishment columns (plus later slug/ICS fields).

## Goal

Unblock platform establishment creation and stats by aligning schema with the
create path, without changing fiscal journal behavior.

## Plan

1. Migration `ADD COLUMN IF NOT EXISTS` for `status`, `tva_number`, `siret_number`.
2. Backfill existing rows to `status = 'active'`.
3. Align stats filters with create values (`setup_required`, etc.).
4. Update `multi-tenant-schema.sql` snapshot.
5. Apply on production and retry create.

## Out of scope

- Unifying legacy aliases (`siret` / `vat_number` vs `siret_number` / `tva_number`) across setup.
- Full establishment onboarding UX polish.
