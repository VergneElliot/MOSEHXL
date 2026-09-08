---
name: code-hygiene
description: >-
  Module size limits, one-file-per-concern layout, and splitting patterns for MOSEHXL/MuseBar.
  Use before adding code to an existing file, when a file approaches 400 lines, when a
  component or route grows a second responsibility, or when the module size check fails.
---

# Code Hygiene

The rule that prevents cleanup passes: **a file has one reason to change**. Size is the symptom
we measure because it is cheap to measure; the real target is single responsibility.

## Hard limits

| Scope | Target | Enforced cap |
|-------|--------|--------------|
| Any `.ts` / `.tsx` source file | ≤ 250 lines | **400 lines** |
| React component (JSX in one component) | ≤ 150 lines | — |
| Function / hook body | ≤ 50 lines | — |
| Route handler | ≤ 40 lines (orchestration only) | — |

`npm run check:module-size` enforces the cap. It runs in `pre-commit` (staged files) and in CI
(all files). Files already over the cap are listed in `scripts/module-size-baseline.json`:
they are allowed to stay, but **they fail the moment they grow**. Never add to a baselined
file — put the new code in a new module. After a cleanup pass, lock the gain in with
`node scripts/check-module-size.mjs --update`; it refuses to raise any existing allowance, so
it can only tighten.

Test files are exempt from the cap, but split them by behaviour anyway — one file per concern
makes failures readable.

## Before adding to an existing file

Ask, in order:

1. **Is this a new responsibility?** Then it is a new file, whatever the current line count.
2. **Would a reader need to scroll past unrelated code to understand it?** New file.
3. **Is the host file baselined or above ~250 lines?** New file, and consider extracting the
   part you are about to touch while you are there.
4. Only then append.

## Splitting patterns

**React container growing** — extract in this order:

```
components/MyFeature/
  MyFeatureContainer.tsx     # orchestration + layout only
  MyFeaturePanel.tsx         # presentational children, one per file
  useMyFeatureState.ts       # useState + actions
  useMyFeatureLogic.ts       # derived values, formatting, no I/O
  useMyFeatureAPI.ts         # ApiService calls
  myFeatureDraft.ts          # pure state helpers — unit-testable without React
```

Pure reducers and helpers extracted this way get unit tests for free; that is the main reason
to extract them, not the line count.

**Express route growing** — the handler stays orchestration only:

```
routes/thing.ts                    # requireAuth → getEstablishmentId → service → response
services/thing/thingService.ts     # business rules
models/thing.ts                    # SQL
```

If a route file collects handlers for several resources, split by resource
(`routes/admin/planning.ts`, `routes/admin/documents.ts`), and mount them from an index.

**Service growing** — split by verb or by collaborator, not by layer:
`planningCommitService.ts`, `planningEmailService.ts` rather than one `planningService.ts`.

**Shared constants and types** — `MuseBar/packages/types` when both sides need them, never a
duplicated literal. A tier table or registry lives in exactly one module and everything else
derives from it.

## Other practices that keep files honest

- **No barrel-file dumping ground.** `index.ts` re-exports; it never holds logic.
- **One exported component per `.tsx`.** Small private helpers in the same file are fine only
  when they are used nowhere else and stay a few lines.
- **No cross-feature imports of internals.** Import a feature's public surface, not its hooks.
- **Delete dead plumbing when the reason for it disappears.** A prop threaded through three
  components to hide a button is worse than the button.
- **Comments explain constraints, not narration.** If a comment describes what the next line
  does, the code needs a better name instead.

## When the check fails

The failure message names the file and whether it is new or grew. Fix by extracting, never by
raising the cap or editing the baseline by hand. If a file genuinely cannot be split (a
generated file, a single long SQL constant), say so in the patch note and get the exception
agreed rather than silently baselining it.
