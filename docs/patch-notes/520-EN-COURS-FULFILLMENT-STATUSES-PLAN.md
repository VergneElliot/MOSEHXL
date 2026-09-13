# 520 — En cours fulfillment: Validé → Envoyé → Servi (PLAN)

## Context

Historique « En cours » maps validated lines to « Envoyé cuisine » because validate
sets `kitchen_sent_at`. Draft lines are labelled « En attente », which duplicates
cart state and does not match comptoir→table assign (no status). Staff need a
clear service pipeline after validation.

## Status model

| Stage | Storage | UI label |
|-------|---------|----------|
| Cart / not validated | `line_status = draft` | Not a service status — omit from En cours item list / header chips |
| Validated | `line_status = validated`, `validated_at` set; `kitchen_sent_at` / `served_at` null | **Validé** |
| Sent | `kitchen_sent_at` set (envoyé bar/cuisine) | **Envoyé** |
| Served | `served_at` set | **Servi** |

Validate must **only** set `validated_at` (stop writing `kitchen_sent_at` on validate).

## Scope

1. Migration: `served_at` on `open_ticket_items`.
2. Backend: set fulfillment `sent` / `served` (PIN); fix ongoing-orders payload + counts.
3. En cours UI: status chips Validé/Envoyé/Servi; actions to advance; age since last step.
4. Copy elsewhere (resume): avoid « En attente » as a service badge where easy.

## Out of scope

- Auto kitchen print = auto Envoyé (print stays separate)
- Runner/waiter role permissions (any POS PIN for now)

## Fiscal impact

PATCH (operational fulfillment only; journal unchanged).
