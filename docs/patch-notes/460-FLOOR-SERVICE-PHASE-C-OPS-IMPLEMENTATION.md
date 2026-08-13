# 460 — Floor service Phase C (transfer, merge, à suivre, waiter History) — Implementation

Date: 2026-08-13  
Plan: `docs/patch-notes/459-FLOOR-SERVICE-PHASE-C-OPS-PLAN.md`  
Branch: `development`

---

## 1) Shipped

| Feature | Behavior |
|---------|----------|
| Transfer | Map mode **Transférer** → free table; `POST /floor/tickets/:id/transfer` |
| Merge | Map mode **Fusionner** → occupied target; source cancelled, lines moved |
| Takeover | **Prendre en charge** → `last_served_by` = PIN actor |
| À suivre | Enabled on cart; kitchen print without fiscal sale (`kitchen_order` + `ticket_kind: follow_up`) |
| Order snapshot | `waiter_user_id`, `waiter_display_name`, `table_label` on `orders` |
| History | Serveur dropdown → `GET /orders?waiter_user_id=` + `GET /orders/waiters` |

---

## 2) Migration

`2026_08_13_23_30_00_order_waiter_table_snapshot.sql`

---

## 3) Notable files

- Backend: `openTicketModel` transfer/merge/takeover; `kitchenFollowUpDispatchService`; floor routes; `OrderModel` filter/count/waiters  
- Frontend: `FloorMapDialog` modes; `useFloorService` ops; `OrderSummary` À suivre; History `SearchBar` waiter filter; `floorOrderAttribution` for createOrder  

Invalid PIN / pin-actor errors remain non-401 so the station session is not kicked.

---

## 4) How to try

1. Badge in → open table → map → **Transférer** / **Fusionner** / **Prendre en charge**  
2. Add lines → **À suivre** (needs kitchen printers configured)  
3. Pay → Historique → filter **Serveur**
