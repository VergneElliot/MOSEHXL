# Fix: .env.development and .env.production Must Not Be Git-Tracked

## What’s wrong?

Two environment-specific files were committed to the repo:

- `MuseBar/backend/.env.development`
- `MuseBar/backend/.env.production`

Both contain **secrets** (e.g. `DB_PASSWORD=postgres`). They were tracked because `.gitignore` did not ignore them.

### Why didn’t .gitignore catch them?

In `.gitignore`, the pattern `*.env` means “any file whose name **ends** with `.env`”:

- `.env` → ends with `.env` → **ignored**
- `.env.development` → ends with `.env.development`, not `.env` → **not ignored**
- `.env.production` → same → **not ignored**

So only a plain `.env` file was ignored. The list that mentions `.env.development.local`, `.env.production.local`, etc. only covers the **`.local`** variants, which are meant for local overrides. The base files `.env.development` and `.env.production` were never listed, so Git tracked them.

### Why is that a problem?

1. **Secrets in history**  
   Anyone with access to the repo (or a clone) can see `DB_PASSWORD=postgres` in those files. If the same password is used elsewhere, or if it’s changed later but history isn’t cleaned, that’s a risk.

2. **Same secret everywhere**  
   Tracked env files encourage reusing the same values (e.g. `postgres`) on every machine and in every environment. Production should use strong, unique secrets, not a shared default.

3. **No separation by environment**  
   Env files should be created per environment (and per machine) from a template or docs, not committed. What’s in the repo becomes “the” config, and people stop treating them as secret.

So: **any file that can hold secrets (`.env`, `.env.development`, `.env.production`, etc.) should be in `.gitignore` and not committed.**

## How we fix it

1. **Ignore the missing patterns**  
   Add explicit entries so Git ignores these files:
   - `.env.development`
   - `.env.production`  
   (and optionally `.env.test` for consistency).  
   That way, even if someone creates them, they won’t be committed.

2. **Stop tracking the existing files (keep them on disk)**  
   Run:
   - `git rm --cached MuseBar/backend/.env.development`
   - `git rm --cached MuseBar/backend/.env.production`  
   This removes them from the **index** (Git’s “staging” of what gets committed) but **does not delete the files** on your machine. Your local setup keeps working.

3. **Commit the change**  
   After the next commit, the repo will no longer contain these two files. They’ll only exist locally. Anyone else cloning the repo will need to create their own (e.g. from a template or from docs) and set their own secrets.

Result: no env files with secrets are tracked; you keep your local `.env.development` and `.env.production`; the fix is methodical and reversible (you can always re-add and commit if you mistakenly want to track them again—but you shouldn’t).
