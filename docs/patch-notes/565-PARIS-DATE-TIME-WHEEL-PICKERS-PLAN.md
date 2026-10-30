# 565 — Paris date/time wheel pickers (PLAN)

## Context

After unifying on `jj/mm/aaaa` + 24h text fields (476/477), native calendar and
clock pickers disappeared. Typing works; picking does not. Restore light **wheel**
selectors with fixed choice lists (24 hours, 12 French month names, days, minutes,
year band) instead of locale-dependent native widgets.

## Scope

- Shared wheel column + date/time dialogs under `components/common/`
- Wire as end adornments on `ParisDateField` / `ParisTimeField` / `ParisDateTimeField`
- Keep typed entry; wheels only assist

## Approach

1. Fixed options: days 1–31 (clamped to month), months `janvier`…`décembre`,
   years today−10…today+5, hours `00`–`23`, minutes `00`–`59`.
2. Dialog with snap-scroll columns; OK commits; Cancel closes.
3. Split field file if adornments push size — re-export path unchanged.

## Verification

- [ ] Open Réservations / Planning / Happy Hour / Clôture — calendar + clock icons open wheels
- [ ] Commit writes `jj/mm/aaaa` / `HH:mm` and still parses to YMD / HM
- [ ] Unit smoke on option helpers if extracted

## Risks

Low — UI-only; storage remains UTC ISO / YMD / HM strings.
