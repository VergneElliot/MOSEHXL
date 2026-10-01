# 553 — Cross-device PIN Slice D: polish + checklist (IMPLEMENTATION)

## Summary

Polish for shared PIN tabs: visibility-aware polling, online/focus refresh,
manual refresh control, empty/expired UX, drop local unlocks when a badge was
closed on another device (after a short grace), skill + CHANGELOG + manual
cross-device checklist. Closes PLAN **549**.

## Files changed

- `MuseBar/src/contexts/usePinSessionsRemoteSync.ts` — `useVisibleInterval`,
  focus/online, in-flight guard, `isSyncing`
- `MuseBar/src/contexts/pinSessionsMerge.ts` (+ test) — grace then drop orphans
- `MuseBar/src/contexts/pinSessionsState.ts` — `localUnlockedAt` on unlock
- `MuseBar/src/contexts/PinSessionsContext.tsx` — expose syncing flag
- `MuseBar/src/components/common/usePinSessionHeaderActions.ts` — auto-prompt
  once when focused badge expires; manual refresh toast
- `MuseBar/src/components/common/PinSessionHeaderTabLabel.tsx` — tooltips
- `MuseBar/src/components/common/PinSessionHeaderTabs.tsx` — empty copy + refresh
- `.cursor/skills/auth-and-multi-tenancy/SKILL.md` — sync / step-up notes
- `CHANGELOG.md` — MINOR

## Behaviour polish

| Area | Behaviour |
|------|-----------|
| Poll | ~12s only while tab visible; immediate on focus / online / Session open/close |
| Manual | Header refresh icon; spinner while syncing |
| Empty | « Aucune session — appuyez sur Session » |
| Expired | Tooltip + auto PIN pad once for the focused expired badge |
| Closed elsewhere | Local unlock dropped after 10s grace if absent from API list |

## Manual cross-device checklist

- [ ] Open badge on caisse → appears on tablet list (locked) without a second clock-in
- [ ] On tablet, tap that badge → PIN for that user → basic POS works without re-PIN
- [ ] Specific action (remise / cancel / …) → PIN every time, even as manager focused
- [ ] Close badge on one device → disappears on the other after refresh/poll; one clock-out
- [ ] Cannot close while open tables (unchanged)
- [ ] Cart on device A does not appear on device B
- [ ] Wrong PIN on locked tab → error; tab stays locked
- [ ] Hide tablet tab → no poll; show again → refresh

## Verification results

- [x] `npx vitest run src/contexts/pinSessionsMerge.test.ts src/contexts/pinSessionsState.test.ts`
- [x] `npm run type-check --workspace musebar`
- [ ] Manual checklist above (ops)

## Fiscal impact

MINOR — session UX / authorization prompts; journal hash rules unchanged.
