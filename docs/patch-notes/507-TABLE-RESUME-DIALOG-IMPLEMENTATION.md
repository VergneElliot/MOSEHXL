# 507 — Plan de salle table resume dialog (IMPLEMENTATION)

## Summary

Plan de salle « Ouvrir / charger » opens a resume dialog before Caisse. Lines show
En attente / Validée chips and ages from existing timestamps; primary CTA loads the
table via existing `openTableInSession`. Transfer / merge unchanged.

## Files changed

- `MuseBar/src/hooks/useFloorPlanManagement.ts` — `resumeTable` intercept on select mode
- `MuseBar/src/components/floor/TableResumeDialog.tsx` — dialog UI + ticket fetch
- `MuseBar/src/components/floor/tableResumeTimers.ts` — elapsed / status / totals helpers
- `MuseBar/src/components/floor/useElapsedTick.ts` — 30s tick
- `MuseBar/src/components/floor/FloorPlanConsultPanel.tsx` — wire dialog
- `MuseBar/src/components/floor/tableResumeTimers.test.ts` — unit tests
- `.cursor/skills/pos-and-floor-service/SKILL.md` — resume dialog note

## Verification results

- Unit: `tableResumeTimers` helpers
- Manual: select → resume → Ouvrir en caisse; free table; transfer/merge direct

## Follow-ups

- Kitchen lifecycle statuses (envoyé / servi) with distinct timestamps — next PLAN.
- Cancelled lines are not returned by `listActiveItems` today; chip mapping is ready
  if a resume-specific include is added later.
