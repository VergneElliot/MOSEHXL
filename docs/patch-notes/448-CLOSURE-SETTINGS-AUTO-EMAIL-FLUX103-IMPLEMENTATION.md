# 448 - Closure Settings, Automatic Accounting Email & Flux 10.3 E-Reporting - Implementation

Date documented: 2026-08-06 (work landed 2026-07-30 → 2026-08-05)  
Roadmap reference: `docs/roadmaps/2026-07-16-SELF-CERTIFICATION-RELEASE-AND-EREPORTING-PLAN.md`  
Evidence: `docs/legal/self-certification/evidence/phase6-ereporting/SAMPLE-FLUX-10.3-CLOSURE.xml`

---

## 1) Context

Two related quality-of-life + compliance improvements around daily closures:

1. **Closure settings got a real backend.** The Settings → Clôture screen previously talked
   to a stubbed hook; now settings persist properly, and they gained a new field:
   **accounting emails** — a list of recipients who automatically receive every closure
   bulletin.
2. **Flux 10.3 groundwork.** France's e-reporting reform (DGFiP, *Spécifications externes*
   v3.2, Annexe 6) defines "Flux 10.3" — an XML summary of B2C transaction aggregates.
   MOSEHXL can now generate that XML from any closure bulletin, download it, and attach it
   to the automatic accounting email.

---

## 2) Closure settings

### Storage — `models/closureSettings.ts`

Settings live in `establishment_settings` under key **`closure`** (JSON), with a
read-only fallback to the legacy `closure_settings` key/value table:

| Setting | Default | Meaning |
|---|---|---|
| `auto_closure_enabled` | `true` | Scheduler creates the daily bulletin automatically |
| `daily_closure_time` | `'02:00'` | When the business day closes (HH:MM, validated) |
| `timezone` | `Europe/Paris` | Closure timezone |
| `grace_period_minutes` | `30` | Clamped 0–120 |
| `accounting_emails` | `[]` | **New** — auto-email recipients; empty list = no auto-send |

Email input is normalized (split on commas/semicolons/whitespace, lowercased, validated,
deduped).

### API — `routes/legal/closureSettings.ts` (gate: `access_settings`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/legal/closure-settings` | Settings + scheduler status (plus legacy flat keys for old clients) |
| PUT | `/api/legal/closure-settings` | Validate + upsert; journals software event `CLOSURE_SETTINGS_UPDATED` |
| POST | `/api/legal/closure-settings/trigger-check` | Run the scheduler check for this venue right now |

Frontend: `ClosureSettings.tsx` adds the *"Emails comptables (envoi automatique des
bulletins)"* field; `useClosureSettings.ts` now performs real GET/PUT/trigger calls.

---

## 3) Automatic closure email — `services/documents/closureAutoEmail.ts`

`maybeAutoEmailClosureBulletin(...)` sends the finished bulletin to
`accounting_emails` (∪ any one-off recipients typed into the create dialog). It attaches
three files: the **PDF bulletin**, the **Excel export**, and the **Flux 10.3 XML**.

It is triggered fire-and-forget (never blocks or fails a closure — errors are only logged
under `CLOSURE_AUTO_EMAIL`) from two places:

1. **Manual closure** (`routes/legal/closure.ts`) — after the fiscal journal finalization,
   with any extra recipients from the dialog's new optional email field.
2. **Automatic closure** (`utils/closureScheduler.ts`) — after each successful scheduled
   closure. The scheduler also switched to reading settings through
   `ClosureSettingsModel` instead of inline SQL, and gained
   `triggerManualCheckForEstablishment` for the new trigger endpoint.

If `accounting_emails` is empty and no extra recipients were given, nothing is sent.

---

## 4) Flux 10.3 service — `services/documents/flux103Service.ts`

`buildFlux103Xml(bulletin, establishment)` produces a `<Report>` document:

- **`ReportDocument`** — id `MOSEHXL-CLOSURE-{id}-{date}`, issue timestamp,
  `TypeCode` `IN`, issuer identified by **SIREN** (derived from SIRET/VAT,
  `schemeId="0002"`) with role `SE` and contact email.
- **`TransactionsReport`** — period start/end (AAAAMMJJ, UTC), currency `EUR`, category
  code `TPS1` by default (overridable to `TLB1`/`TNT1`/`TMA1`), total excl. tax, total tax,
  transaction count, and one `TaxSubtotal` per VAT rate from the bulletin's `vat_10` /
  `vat_20` breakdown (falls back to treating totals as 20% if the breakdown is missing).

Helpers: `buildFlux103Filename` (`flux103-closure-{id}-{AAAAMMJJ}.xml`) and
`buildFlux103Attachment`. **Honest scope note:** this is schema-*shaped* generation with
escaping and rounding, not yet validation against the official XSD — that follow-up is
planned once the DGFiP vendor package is filed. Unit tests (`flux103Service.test.ts`) pin
the date format, totals, VAT lines, SIREN extraction, and the category override. A static
sample XML is checked into the self-certification evidence folder (phase 6, e-reporting).

### Export endpoint

`GET /api/printing/closure/:bulletinId/export-flux103` (auth + venue scoped) downloads the
XML; `PrintClosureDialog.tsx` gained a **Flux 10.3 XML** export button, and the dialog now
supports multi-recipient emailing prefilled with the accounting emails.

---

## 5) Email infrastructure touch-ups

- Default From addresses migrated `musebar.com` → `mosehxl.com`
  (`noreply@mosehxl.com`, support → `support@mosehxl.com`).
- In production, a missing `SENDGRID_API_KEY` now yields an explicit failure instead of a
  silent fake success (non-prod still logs-and-pretends for development).
- `BuiltInTemplates` registers the nine reservation templates and the shift confirmation
  template (notes 444/445); `documentEmailService` validates multiple recipients and
  attaches the Flux XML to closure emails.

---

## 6) Rollback

Revert the commit. Settings written under the `closure` key are ignored by older code
(which reads the legacy table); no migration is involved in this slice.
