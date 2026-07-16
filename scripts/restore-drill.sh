#!/usr/bin/env bash
# Restore-drill helper: restore a production dump into isolated DB mosehxl_restore_drill
# and run basic integrity checks. NEVER restores over mosehxl_production.
set -euo pipefail

ENV_FILE="${MOSEHXL_ENV_FILE:-/var/www/MOSEHXL/MuseBar/backend/.env}"
DUMP_PATH="${1:-}"
DRILL_DB="${MOSEHXL_RESTORE_DRILL_DB:-mosehxl_restore_drill}"

if [[ -z "$DUMP_PATH" || ! -f "$DUMP_PATH" ]]; then
  echo "Usage: $0 /path/to/mosehxl-prod-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
export PGPASSWORD="$DB_PASSWORD"

echo "Restoring $DUMP_PATH -> $DRILL_DB (production DB=$DB_NAME untouched)"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d defaultdb -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DRILL_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DRILL_DB};
CREATE DATABASE ${DRILL_DB} OWNER doadmin;
SQL

pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" \
  --no-owner --no-acl "$DUMP_PATH"

echo "=== production vs drill counts ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT 'production' AS env, count(*) AS entries FROM legal_journal;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" -c \
  "SELECT 'restore_drill' AS env, count(*) AS entries FROM legal_journal;"

echo "=== era-D hash check (seq >= 19363) ==="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" -v ON_ERROR_STOP=1 <<'SQL'
WITH j AS (
  SELECT *,
    encode(digest(
      previous_hash || '|' || concat_ws('|',
        sequence_number::text, transaction_type::text,
        CASE WHEN order_id IS NULL THEN 'null' WHEN order_id = 0 THEN '' ELSE order_id::text END,
        amount::text, vat_amount::text, payment_method::text,
        to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        register_id::text
      ), 'sha256'), 'hex') AS recomputed
  FROM legal_journal
  WHERE sequence_number >= 19363
)
SELECT count(*) AS entries,
       count(*) FILTER (WHERE current_hash = recomputed) AS pass,
       count(*) FILTER (WHERE current_hash <> recomputed) AS fail
FROM j;
SQL

echo "Restore drill complete. Drop ${DRILL_DB} when finished if desired."
