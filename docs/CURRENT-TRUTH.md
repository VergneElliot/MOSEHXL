# MOSEHXL - Current Truth

This page is the fastest way to find the current state of the project without scanning hundreds of patch-note files manually.

## Primary live-status sources

- Latest audit state: `docs/audits/2026-05-20-full-repo-state-audit-hard-copy.md`
- Latest code closure pass: `docs/audits/2026-05-28-code-closure-pass.md`
- Branch reality and operational notes: `DEVELOPMENT-STATE.md`
- Latest patch-note index (auto-generated): `docs/patch-notes/LATEST-INDEX.md`

## Refreshing the patch-note index

From repo root:

```bash
npm run docs:patch-notes-index
```

This regenerates `docs/patch-notes/LATEST-INDEX.md` from files currently present in `docs/patch-notes/`, sorted by patch-note number (newest first).

## Usage guidance

- If audit and patch notes disagree, prefer the latest audit row status and the newest patch-note entries.
- For migration/schema truth, always prioritize migration chain status (`npm run migration:status`) and migration SQL files over static snapshot SQL.
