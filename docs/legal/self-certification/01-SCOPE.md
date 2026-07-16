# 01 - Self-Certification Scope

Status: **Approved** — 2026-07-16 (decision D2)  
Owner: MOSEHXL publisher  

---

## Approved Scope Claim

> MOSEHXL self-certifies the fiscal cash-register/POS module used to record B2C
> sales, cancellations/refunds, cash-register change operations, receipts,
> closure bulletins, legal journal entries, audit trail, and legal archives for
> French restaurant/bar establishments.

This is the first signed scope because it maps directly to the strongest code
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

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| B2B invoice subsystem | Adjacent module (not in first signed claim) | Strong compliance hardening exists; invoices have separate legal requirements |
| SaaS billing/subscription management | Exclude | Not the cash-register fiscal core |
| Hardware/OS/device configuration | Exclude | Operational environment, not software fiscal logic |
| Payment processor/acquirer behavior | Exclude | External system; MOSEHXL records the payment facts |
| Customer venue network/printer availability | Exclude | Operational dependency, not fiscal data authority |
| NF-525/LNE certification mark | Exclude | External paid certification, not self-attestation |

---

## Version and Build Scope

| Field | Value |
|-------|-------|
| Product name | MOSEHXL |
| Product family | Restaurant/bar POS and fiscal compliance backend |
| Covered release version | **2.0.1** |
| Covered git tag | **`self-cert-v2.0.1`** |
| Covered git commit | Tip of tag `self-cert-v2.0.1` (attach `git rev-parse self-cert-v2.0.1^{}` at signature) |
| Covered deployment environment | Production `mosehxl.com` + DigitalOcean managed PostgreSQL `mosehxl_production` |
| Database migration state | 44 migrations (captured in Phase 3 + restore drill) |

Do not sign against `development` as a moving branch. The attestation names the
tag above only.

---

## Explicit Non-Claims

1. MOSEHXL is **not** currently NF-525/LNE certified by an external body.
2. MOSEHXL does **not** claim that customer hardware, network equipment,
   printers, or payment terminals are certified by this document.
3. Operational conservation relies on the controls evidenced in
   `04-OPERATIONAL-CONTROLS.md` and `evidence/phase4-ops/`.
4. MOSEHXL does **not** certify unreleased future code changes automatically.
   Each material fiscal change must produce a new evidence entry and, when
   needed, a new attestation (MAJOR per BOFiP).

---

## Decisions Closed Before Signature

| Decision | Resolution | Status |
|----------|------------|--------|
| Include B2B invoice subsystem in first signed scope? | No — adjacent evidence only | **Closed** |
| Include print bridge in first signed scope? | Only as print transport, not fiscal authority | **Closed** |
| Freeze a release tag before signing? | Yes — `self-cert-v2.0.1` | **Closed** |
| Obtain legal/accounting review before signing? | Strongly recommended; not a technical blocker — see `07-SIGNING-PACKET.md` | **Owner action** |
