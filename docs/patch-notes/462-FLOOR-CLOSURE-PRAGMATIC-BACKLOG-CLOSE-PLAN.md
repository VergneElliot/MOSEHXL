# 462 — Close remaining floor/closure backlog (pragmatic) — Plan

Date: 2026-08-27  
Branch: `development`  
Prior: Floor A–C (`455`–`460`), closure incident (`461`)

---

## 1) Goal

Close open floor/closure debt so new feature work starts clean, without building the full Phase D mountain.

| In scope | Out (parked Phase D+) |
|----------|------------------------|
| Patch index includes 461+ | Drag-canvas floor editor |
| Smarter `business_day` date default | Multi-station websockets |
| Auto-closure harden + re-enable checklist (no silent prod flip) | Full PIN-authorize migration |
| Admin PIN set/clear/status | Seasonal-worker template UX |
| POS multi-plan switcher + light Admin floor CRUD | |
| Waiter day CA report (non-fiscal) | |

---

## 2) Closure

1. Regenerate `docs/patch-notes/LATEST-INDEX.md`.
2. Suggest last business day with unclosed sales (or current business day via cut) when opening daily `business_day` mode.
3. Scheduler tests + Settings warning; production auto stays off until operator confirms checklist.

---

## 3) Floor / PIN Admin

1. User Management: set / clear / status PIN (`access_user_management`).
2. POS map: plan selector; tables for active plan only.
3. Admin section: plans + tables CRUD via existing `/api/floor` (forms only).

---

## 4) Waiter day report

Business-day window (cut→cut), group paid orders by waiter snapshot; UI read-only totals. Not a fiscal bulletin.

---

## 5) Ship

Implementation patch `463`; commit/push `development` only unless deploy requested.
