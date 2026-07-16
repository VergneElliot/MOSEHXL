#!/usr/bin/env bash
# Daily PostgreSQL logical backup for MOSEHXL production.
# Read-only against source; does not disable fiscal triggers.
# - Daily dumps: 35-day rolling (local + same-host secondary path)
# - Monthly copies: long-retention directory (6 years / 2190 days)
# - Optional S3/Spaces sync when MOSEHXL_S3_BUCKET is set
set -euo pipefail

ENV_FILE="${MOSEHXL_ENV_FILE:-/var/www/MOSEHXL/MuseBar/backend/.env}"
BACKUP_DIR="${MOSEHXL_BACKUP_DIR:-/var/www/MOSEHXL/backups}"
OFFSITE_DIR="${MOSEHXL_OFFSITE_BACKUP_DIR:-/root/mosehxl-backups}"
LONG_RETENTION_DIR="${MOSEHXL_LONG_RETENTION_DIR:-/var/www/MOSEHXL/backups/long-retention}"
RETENTION_DAYS="${MOSEHXL_BACKUP_RETENTION_DAYS:-35}"
LONG_RETENTION_DAYS="${MOSEHXL_LONG_RETENTION_DAYS:-2190}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DAY_UTC="$(date -u +%d)"
LOG_DIR="${MOSEHXL_BACKUP_LOG_DIR:-/var/log/mosehxl}"
LOG_FILE="${LOG_DIR}/db-backup.log"

mkdir -p "$BACKUP_DIR" "$OFFSITE_DIR" "$LONG_RETENTION_DIR" "$LOG_DIR"

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_NAME:?}"

# Prefer dedicated read-only backup role when configured
DUMP_USER="${DB_BACKUP_USER:-${DB_USER:?}}"
DUMP_PASSWORD="${DB_BACKUP_PASSWORD:-${DB_PASSWORD:?}}"

export PGPASSWORD="$DUMP_PASSWORD"
DUMP_NAME="mosehxl-prod-${STAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_NAME}"

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup of ${DB_NAME} as ${DUMP_USER}"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DUMP_USER" -d "$DB_NAME" \
    --format=custom --no-owner --no-acl \
    -f "$DUMP_PATH"
  sha256sum "$DUMP_PATH" | tee "${DUMP_PATH}.sha256"
  cp -a "$DUMP_PATH" "${OFFSITE_DIR}/${DUMP_NAME}"
  cp -a "${DUMP_PATH}.sha256" "${OFFSITE_DIR}/"

  # Monthly (or forced) long-retention copy — not purged by the 35-day rolling cleanup
  if [[ "${MOSEHXL_FORCE_MONTHLY:-0}" == "1" || "$DAY_UTC" == "01" ]]; then
    MONTH_NAME="mosehxl-prod-monthly-$(date -u +%Y-%m).dump"
    cp -a "$DUMP_PATH" "${LONG_RETENTION_DIR}/${MONTH_NAME}"
    cp -a "${DUMP_PATH}.sha256" "${LONG_RETENTION_DIR}/${MONTH_NAME}.sha256"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Long-retention monthly copy ${MONTH_NAME}"
  fi

  # Optional object storage (DigitalOcean Spaces / S3-compatible). Enable object-lock on the
  # bucket in the provider console for WORM. Requires aws CLI + credentials in env/instance profile.
  if [[ -n "${MOSEHXL_S3_BUCKET:-}" ]]; then
    if command -v aws >/dev/null 2>&1; then
      AWS_ARGS=(s3 cp "$DUMP_PATH" "s3://${MOSEHXL_S3_BUCKET}/daily/${DUMP_NAME}")
      if [[ -n "${MOSEHXL_S3_ENDPOINT:-}" ]]; then
        AWS_ARGS+=(--endpoint-url "$MOSEHXL_S3_ENDPOINT")
      fi
      aws "${AWS_ARGS[@]}"
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Uploaded daily dump to s3://${MOSEHXL_S3_BUCKET}/daily/"
      if [[ "${MOSEHXL_FORCE_MONTHLY:-0}" == "1" || "$DAY_UTC" == "01" ]]; then
        MONTH_NAME="mosehxl-prod-monthly-$(date -u +%Y-%m).dump"
        aws s3 cp "${LONG_RETENTION_DIR}/${MONTH_NAME}" \
          "s3://${MOSEHXL_S3_BUCKET}/monthly/${MONTH_NAME}" \
          ${MOSEHXL_S3_ENDPOINT:+--endpoint-url "$MOSEHXL_S3_ENDPOINT"}
      fi
    else
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN MOSEHXL_S3_BUCKET set but aws CLI missing"
    fi
  fi

  # Rolling retention (local + same-host secondary) — never touches LONG_RETENTION_DIR except age policy
  find "$BACKUP_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump' -mtime "+${RETENTION_DAYS}" -delete
  find "$BACKUP_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump.sha256' -mtime "+${RETENTION_DAYS}" -delete
  find "$OFFSITE_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump' -mtime "+${RETENTION_DAYS}" -delete
  find "$OFFSITE_DIR" -maxdepth 1 -name 'mosehxl-prod-*.dump.sha256' -mtime "+${RETENTION_DAYS}" -delete
  find "$LONG_RETENTION_DIR" -maxdepth 1 -name 'mosehxl-prod-monthly-*.dump' -mtime "+${LONG_RETENTION_DAYS}" -delete
  find "$LONG_RETENTION_DIR" -maxdepth 1 -name 'mosehxl-prod-monthly-*.dump.sha256' -mtime "+${LONG_RETENTION_DAYS}" -delete
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] OK ${DUMP_NAME} size=$(stat -c%s "$DUMP_PATH")"
} >>"$LOG_FILE" 2>&1
