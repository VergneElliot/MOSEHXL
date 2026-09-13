# 518 — One-click invoices + split-part print (PLAN)

## Context

History/POS print dialog requires many client/legal fields before an invoice.
Staff want a single click when possible. Split orders can only print the whole
sale, not one payment part.

## Legal (France) — what stays required

On a **facture** (Service Public F31808 / CGI):

| Field | Required? | UX approach |
|-------|-----------|-------------|
| Seller identity (SIRET, address, TVA…) | Yes | From Settings (already) |
| Client **name** | Yes | Default « Client »; editable for B2B |
| Client **address** | No for particulier who objects | Optional |
| Email / TVA client | No (except some B2B) | Optional |
| Due date, payment terms, late penalties, €40 fee | Yes on commercial invoices | Auto-default for POS paid sales |

Ticket de caisse stays separate (no client form).

## Scope

1. Soften create-invoice API: default name/legal terms server-side; address optional.
2. UI: invoice print works with defaults; optional « Infos client / B2B » expander.
3. Split: pick payment part N → receipt or invoice for that `sub_bill` only.
4. Migration: `legal_invoices.sub_bill_id` + uniqueness per order / per part.

## Fiscal impact

PATCH (document UX / attribution of print payload; journal hash unchanged).
