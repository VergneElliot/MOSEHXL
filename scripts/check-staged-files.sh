#!/usr/bin/env bash
# Pre-commit guard: block large files and SQL outside migration paths.
set -euo pipefail

MAX_BYTES=$((1024 * 1024)) # 1 MiB
FAIL=0

while IFS= read -r -d '' file; do
  if [[ ! -f "$file" ]]; then
    continue
  fi

  size=$(wc -c <"$file" | tr -d ' ')
  if (( size > MAX_BYTES )); then
    echo "ERROR: Staged file exceeds 1 MiB ($size bytes): $file"
    FAIL=1
  fi

  if [[ "$file" == *.sql ]] && [[ "$file" != MuseBar/backend/src/migrations/files/* ]]; then
    echo "ERROR: Staged SQL outside migrations: $file"
    echo "       Use: cd MuseBar/backend && npm run migration:create <name>"
    FAIL=1
  fi

  if [[ "$file" == backups/* ]] || [[ "$file" == */backups/* ]]; then
    echo "ERROR: Do not commit backups/: $file"
    FAIL=1
  fi
done < <(git diff --cached --name-only -z --diff-filter=ACMR)

exit $FAIL
