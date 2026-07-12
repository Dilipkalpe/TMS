#!/usr/bin/env bash
# Backup database for one app/environment.
# Usage: bash deploy/environments/scripts/backup.sh <tms|ims|rms> <prod|demo>
set -euo pipefail

APP="${1:?Usage: backup.sh <tms|ims|rms> <prod|demo>}"
ENV="${2:?Usage: backup.sh <tms|ims|rms> <prod|demo>}"

APP_ROOT="/var/www/${ENV}/${APP}"
ENV_FILE="${APP_ROOT}/.env"

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${ENV}-${APP}}"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/${DB_NAME}_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

COMPOSE_FILE=""
if [ -f "${APP_ROOT}/deploy/environments/compose/${APP}.stack.yml" ]; then
  COMPOSE_FILE="${APP_ROOT}/deploy/environments/compose/${APP}.stack.yml"
elif [ -f "${APP_ROOT}/deploy/environments/compose/tms.stack.yml" ] && [ "$APP" = "tms" ]; then
  COMPOSE_FILE="${APP_ROOT}/deploy/environments/compose/tms.stack.yml"
fi

echo "==> Backup ${DB_NAME} -> ${OUT}"

if [ -n "$COMPOSE_FILE" ] && [ -f "$COMPOSE_FILE" ]; then
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$OUT"
else
  PG_CONTAINER=$(docker ps -q -f "name=${COMPOSE_PROJECT_NAME}" -f "name=postgres" | head -1)
  if [ -z "$PG_CONTAINER" ]; then
    echo "ERROR: postgres container not found for ${COMPOSE_PROJECT_NAME}"
    exit 1
  fi
  docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl | gzip > "$OUT"
fi

# Retain last 14 daily backups
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +14 -delete 2>/dev/null || true

echo "Done: $(du -h "$OUT" | cut -f1)"
