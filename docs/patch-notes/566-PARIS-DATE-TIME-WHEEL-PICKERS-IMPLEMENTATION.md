# 566 — Paris date/time wheel pickers (IMPLEMENTATION)

## Summary

Restored calendar / clock affordances on French date-time fields via light **wheel**
dialogs (fixed choice lists), without native locale pickers.

- Date: jour + mois (noms FR) + année (aujourd’hui −10 … +5)
- Time: heures `00`–`23`, minutes `00`–`59`
- Text entry unchanged; icon opens the wheel; OK commits YMD / HH:mm

## Files

- `parisWheelOptions.ts` (+ test), `ParisWheelColumn.tsx`
- `ParisDateWheelDialog.tsx`, `ParisTimeWheelDialog.tsx`
- Split `ParisDateField.tsx` / `ParisTimeField.tsx`; `ParisDateTimeField.tsx` composes them
  (same import path)

## Fiscal impact

PATCH — UI only.
