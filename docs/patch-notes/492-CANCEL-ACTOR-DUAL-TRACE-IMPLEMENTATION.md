# 492 — Cancellation dual-actor journal/audit (IMPLEMENTATION)

Closes the remaining dual-traceability gap called out in
[490](490-BADGE-SESSIONS-DUAL-TRACEABILITY-IMPLEMENTATION.md): SALE already recorded
account + PIN session; cancellations did not.

## What changed

- `LegalJournalModel.logChange` accepts an optional `actor` block (stored in
  `transaction_data`, **outside** the hash payload).
- New `services/orders/cancellationActorWrites.ts` owns journal + audit writes for
  change-cancel, tip reversal, and order cancellation, so `orderCancellationService`
  (baselined at the module-size cap) does not grow.
- `POST .../cancel-unified` passes `resolveActor(req)` into the service.

Also locked in docs (no new product behaviour):

- Plan [486](486-IDENTITY-SESSIONS-PERMISSIONS-FOUNDATION-PLAN.md) records the decided
  lifetime (12h / 60 min idle / daily closure) and deactivate-vs-purge semantics.
- `auth-and-multi-tenancy` skill updated to match the shipped model and the
  “specific permission = PIN session or one-shot PIN + checkbox” convention.

## Fiscal impact

**PATCH** — append-only journal enrichment in non-hashed `transaction_data` only.
