# 01 - Self-Certification Scope

Status: Draft  
Owner to complete: MOSEHXL publisher/operator  

---

## Recommended Scope Decision

Recommended initial claim:

> MOSEHXL self-certifies the fiscal cash-register/POS module used to record B2C
> sales, cancellations/refunds, cash-register change operations, receipts,
> closure bulletins, legal journal entries, audit trail, and legal archives for
> French restaurant/bar establishments.

This is the safest first scope because it maps directly to the strongest code
evidence: order completion, payment, refund/cancellation, journal append,
closure, receipt, audit, and archive flows.

---

## Included Modules

| Area | Included? | Notes |
|------|-----------|-------|
| POS order creation and payment | Yes | Completed sales create fail-closed legal journal entries and audit records |
| Refund/cancellation/change operations | Yes | Cancellation and change flows append legal journal entries and audit records |
| Receipt generation and preview/printing payloads | Yes | Receipt content is part of the sales evidence path |
| Legal journal | Yes | Per-establishment sequence and hash chain, DB-level immutability guards |
| Audit trail | Yes | Tracks user/system actions with tenant context and request metadata |
| Closure bulletins | Yes | Daily/monthly/annual closure evidence and reconciliation metadata |
| Legal archives | Yes | Archive creation, verification, download/export, signature metadata |
| Establishment legal identity settings | Yes | Required for compliant fiscal documents and invoice outputs |
| User/auth/security controls | Yes, as supporting controls | Access control, auditability, session revocation, TOTP, lockout |
| Print bridge transport | Limited support role | Included only as an output transport for print jobs; fiscal authority remains backend journal/archive data |

---

## Adjacent But Separately Scoped Modules

These modules can be documented in the evidence package but should not broaden
the initial self-certification claim unless the publisher intentionally chooses
to include them:

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| B2B invoice subsystem | Adjacent module | It has strong compliance hardening, but invoices have separate legal requirements and a broader functional surface |
| SaaS billing/subscription management | Exclude | Not the cash-register fiscal core |
| Hardware/OS/device configuration | Exclude | Operational environment, not software fiscal logic |
| Payment processor/acquirer behavior | Exclude | External system; MOSEHXL records the payment facts |
| Customer venue network/printer availability | Exclude | Operational dependency, not fiscal data authority |
| NF-525/LNE certification mark | Exclude | External paid certification, not self-attestation |

---

## Version and Build Scope

The final signed attestation must name a fixed release:

| Field | Value |
|-------|-------|
| Product name | MOSEHXL |
| Product family | Restaurant/bar POS and fiscal compliance backend |
| Covered release version | To fill at release freeze |
| Covered git commit | To fill at release freeze |
| Covered git tag | To fill at release freeze |
| Covered deployment environment | Production configuration documented at release freeze |
| Database migration state | Migration status output captured at release freeze |

Do not sign against `development` as a moving branch. Freeze a release tag, then
reference that tag and commit in the attestation.

---

## Explicit Non-Claims

The self-certification dossier should explicitly state:

1. MOSEHXL is **not** currently NF-525/LNE certified by an external body.
2. MOSEHXL does **not** claim that customer hardware, network equipment,
   printers, or payment terminals are certified by this document.
3. MOSEHXL does **not** claim that operational backups/retention are compliant
   until the operator implements and records the controls in
   `04-OPERATIONAL-CONTROLS.md`.
4. MOSEHXL does **not** certify unreleased future code changes automatically.
   Each material fiscal change must produce a new evidence entry and, when
   needed, an attestation addendum.

---

## Open Decisions Before Signature

| Decision | Recommendation | Status |
|----------|----------------|--------|
| Include B2B invoice subsystem in first signed scope? | No, document as adjacent evidence first | Open |
| Include print bridge in first signed scope? | Only as print transport, not fiscal authority | Open |
| Freeze a release tag before signing? | Yes, mandatory | Open |
| Obtain legal/accounting review before signing? | Strongly recommended | Open |
