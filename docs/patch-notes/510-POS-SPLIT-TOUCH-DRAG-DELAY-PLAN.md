# 510 — POS / Split touch drag delay (PLAN)

## Context

HTML5 `draggable` on product cards and the split board uses the OS long-press on
touch (often multi-second). Desktop mouse drag is fine; tablets need a controllable
idle-press delay that still allows scrolling.

## Goal

Shared touch-drag layer: **500 ms** idle press, **10 px** move tolerance (scroll wins),
wired to ProductGrid → cart and SplitBoard pool → bills. Desktop HTML5 DnD unchanged.
Split context menu long-press **800 ms** (after drag arm).

## Approach

Custom `attachPosTouchDrag` + `data-pos-drop` targets; ghost chip shared with HTML5.

## Fiscal impact

PATCH (touch UX only, non-ISCA).
