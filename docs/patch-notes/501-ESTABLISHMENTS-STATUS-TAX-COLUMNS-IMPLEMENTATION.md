# 501 — Establishments status/tax columns (IMPLEMENTATION)

## Changes

- Migration `2026_09_08_21_00_00_establishments_status_and_tax_columns.sql`:
  adds `status`, `tva_number`, `siret_number`; existing venues → `active`.
- Stats (`enhancedEstablishments` + `EstablishmentDataProcessor`) count
  `setup_required` / `pending_setup` / `setup_in_progress` as pending setup.
- `multi-tenant-schema.sql` updated to match.

## Verification

- `migration:status` → pending 0 after apply
- `POST /api/establishments` succeeds for a new venue
- `GET /api/establishments/stats` returns 200
