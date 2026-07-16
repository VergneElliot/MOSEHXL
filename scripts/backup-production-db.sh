#!/usr/bin/env bash
# Daily PostgreSQL logical backup for MOSEHXL production.
# Read-only against source; does not disable fiscal triggers.
# Usage: install via cron (see docs/legal/self-certification evidence Phase 4).
set -euo pipefail

ENV_FILE="${MOSEHXL_ENV_FILE:-/var/www/MOSEHXL/MuseBar/backend/.env}"
BACKUP_DIR="${MOSEHXL_BACKUP_DIR:-/var/www/MOSEHXL/backups}"
OFFSITE_DIR="${MOSEHXL_OFFSITE_BACKUP_DIR:-/root/mosehxl-backups}"
RETENTION_DAYS="${MOSEHXL_BACKUP_RETENTION_DAYS:-35}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG_DIR="${MOSEHXL_BACKUP_LOG_DIR:-/var/log/mosehxl}"
LOG_FILE="${LOG_DIR}/db-backup.log"

mkdir -p "$BACKUP_DIR" "$OFFSITE_DIR" "$LOG_DIR"

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_NAME:?}" "${DB_PASSWORD:?}"

export PGPASSWORD="$DB_PASSWORD"
DUMP_NAME="mosehxl-prod-${STAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_NAME}"

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup of ${DB_NAME}"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom --no-owner --no-acl \
    -f "$DUMP_PATH"
  sha256sum "$DUMP_PATH" | tee "${DUMP_PATH}.sha256"
  cp -a "$DUMP_PATH" "${OFFSITE_DIR}/${DUMP_NAME}"
  cp -a "${DUMP_PATH}.sha256" "${OFFSITE_DIR}/"
  # Rolling retention (local + offsite copies on this host)
  find "$BACKUP_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump' -mtime "+${RETENTION_DAYS}" -delete
  find "$BACKUP_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump.sha256' -mtime "+${RETENTION_DAYS}" -delete
  find "$OFFSITE_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump' -mtime "+${RETENTION_DAYS}" -delete
  find "$OFFSITE_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump.sha256' -mtime "+${RETENTION_DAYS}" -delete
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] OK ${DUMP_NAME} size=$(stat -c%s "$DUMP_PATH")"
} >>"$LOG_FILE" 2>&1
