# 562 — PIN portal, honest pointage, IPv6 allowlist (IMPLEMENTATION)

## Summary

- **IPv6 /64** venue allowlist so privacy-extension addresses match the box prefix.
- **Honest close**: API returns `pointage` outcome; toasts no longer claim sortie when hours were skipped; audit stores `pointage_recorded` / `on_venue` / `client_ip`.
- Clock-out by `user_id` even if the badge row is already closed; badge TTL expiry clocks out orphan open shifts.
- **Portal home** after venue login: color-coded staff cards (green / orange / red, blurred when unlocked elsewhere).
- Header shows **owned tables** + red **Portail** return (no clock-out); logout only via card red X + PIN.

## Fiscal impact

PATCH / MINOR — pointage / authorization UX; legal journal unchanged aside from richer `pin_session_closed` / `pin_session_close_failed` details.
