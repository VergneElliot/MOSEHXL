# 464 — Visual floor plan editor — Plan

Date: 2026-08-27  
Branch: `development`  
Prior: Floor A–C (`455`–`460`), light Admin CRUD (`462`/`463`)

---

## 1) Goal

Replace form-only table setup with a **visual canvas editor** so owners can lay out rooms by dragging tables. POS map uses the **same geometry**.

v1: **tables only** (no walls, no background image). Multiple plans already supported.

---

## 2) UX

**Admin → Plans de tables**

| Area | Behavior |
|------|----------|
| Left | Plan list: create / rename / activate / delete |
| Center | Canvas: pan/zoom, drag tables, resize selected |
| Right | Selected table: label, covers, shape, size preset S/M/L |
| Toolbar | + Table, + N tables (grid), snap on/off, zoom |

Autosave geometry on drop/resize. Touch-friendly hit targets.

**POS map**

- Same `pos_x/y/width/height/shape`; free = green, occupied = warning; click = existing open/load/transfer/merge.

---

## 3) Technical

- Existing columns + `PATCH /floor/tables/:id` already support geometry.
- Extend FE `createDiningTable` / `updateDiningTable` payloads for width/height/shape/pos.
- Shared canvas renderer for Admin (edit) and POS (select).
- No schema migration required for v1.

---

## 4) Out of v1

Walls, background image, rotation, CAD scale, live multi-user edit.

---

## 5) Ship

Implementation `465`; commit/push `development`.
