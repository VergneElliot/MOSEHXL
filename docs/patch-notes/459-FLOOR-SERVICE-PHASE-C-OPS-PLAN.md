# 459 — Floor service Phase C (ops: transfer, merge, à suivre, waiter History) — Plan

Date: 2026-08-13  
Branch: `development`  
Prior: Phase A `455`/`456`, Phase B `457`/`458`

---

## 1) Goal

Service ops on top of open tickets so a busy floor works:

| Capability | Meaning |
|------------|---------|
| **Transfer table** | Move an open ticket to another free table |
| **Take over / transfer waiter** | Reassign `last_served_by` to current PIN actor |
| **Merge tickets** | Move lines from source → target open ticket; cancel source |
| **À suivre** | Kitchen print of current (selected) lines without fiscal sale |
| **Waiter on order + History filter** | Snapshot waiter/table on paid orders; filter History by waiter |

---

## 2) Scope

### In scope

1. Migration: `orders.waiter_user_id`, `orders.waiter_display_name`, `orders.table_label` (+ indexes)  
2. APIs (PIN actor required where mutating tickets):
   - `POST /floor/tickets/:id/transfer` `{ dining_table_id }`
   - `POST /floor/tickets/:id/takeover` (set last_served_by = pin actor)
   - `POST /floor/tickets/:id/merge` `{ target_ticket_id }`
   - `POST /floor/tickets/:id/print-suivre` `{ item_ids?: number[] }` → kitchen dispatch, non-fiscal  
3. `createOrder` accepts optional `waiter_user_id`, `waiter_display_name`, `table_label` (FE sends when table-bound)  
4. `GET /orders?waiter_user_id=`  
5. POS: map transfer/merge modes; enable **À suivre**; History waiter dropdown  

### Out of scope

- Full waiter day PDF / closure filters (Phase D)  
- Visual drag editor  
- Course firing / KDS  

---

## 3) UX

**Map dialog**

- With an active ticket: actions **Transférer** (pick free table) / **Fusionner** (pick occupied other table) / **Prendre en charge** (takeover)  
- Occupied tables show last server when available  

**À suivre**

- Enabled when PIN + (table bound or cart has sale lines)  
- Prints kitchen tickets for sale lines (or selection); header `À SUIVRE` + table label if any  
- Does not create an order / does not clear cart  

**History**

- Optional filter « Serveur » from distinct waiters on recent orders (or memberships with PIN)  

---

## 4) Verification

1. Open table A → transfer to free B → status updates  
2. Second waiter badges in → takeover → `last_served_by` updates  
3. Merge A into B → A cancelled, B has combined lines  
4. À suivre prints (or queues) without CA  
5. Pay → order has waiter/table snapshot; History filter shows that order  

---

## 5) Docs / ship

Implementation patch `460`; stay on `development` only.
