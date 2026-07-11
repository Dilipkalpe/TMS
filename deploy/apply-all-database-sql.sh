#!/usr/bin/env bash
# Apply all TMS SQL scripts from database/ to live PostgreSQL (idempotent).
#
# Run on VPS (recommended):
#   cd /var/www/tms && git pull && bash deploy/apply-all-database-sql.sh
#
# Options:
#   INCLUDE_SEED=1     Also run seed.sql (demo users/data — not for production)
#   SKIP_API_RESTART=1 Do not restart tms-api after apply
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DB_USER="${DB_USER:-tms}"
DB_NAME="${DB_NAME:-tms_pro}"
MANIFEST="${MANIFEST:-$REPO_DIR/database/install-manifest.txt}"
INCLUDE_SEED="${INCLUDE_SEED:-0}"
SKIP_API_RESTART="${SKIP_API_RESTART:-0}"

cd "$REPO_DIR"

PG=$(docker ps -q -f name=postgres | head -1)
if [ -z "$PG" ]; then
  echo "ERROR: postgres container not found."
  docker ps
  exit 1
fi

psql_exec() {
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 "$@"
}

run_sql_file() {
  local rel="$1"
  local f="$REPO_DIR/$rel"
  if [ ! -f "$f" ]; then
    echo "  SKIP (missing): $rel"
    return 0
  fi
  echo "  RUN $rel"
  if ! psql_exec < "$f"; then
    echo "  WARN: $rel reported errors (often safe on re-run)"
  fi
}

echo "============================================"
echo " TMS — Apply all database SQL scripts"
echo " Repo:     $REPO_DIR"
echo " Database: $DB_NAME @ container $PG"
echo "============================================"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: manifest not found: $MANIFEST"
  exit 1
fi

echo ""
echo "==> Applying SQL from install-manifest.txt ..."
while IFS= read -r line; do
  line="${line%%#*}"
  line="$(echo "$line" | xargs)"
  [ -z "$line" ] && continue
  run_sql_file "$line"
done < "$MANIFEST"

if [ "$INCLUDE_SEED" = "1" ]; then
  echo ""
  echo "==> Seed data (INCLUDE_SEED=1) ..."
  run_sql_file database/seed.sql
  run_sql_file database/seed_accounting.sql
  run_sql_file database/hr/seed.sql
  run_sql_file database/maintenance/seed.sql
fi

echo ""
echo "==> Repair GPS / notification unique indexes ..."
psql_exec <<'SQL' || true
DELETE FROM vehicle_last_position a USING vehicle_last_position b WHERE a.vehicle_id = b.vehicle_id AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_last_position_vehicle_id ON vehicle_last_position(vehicle_id);
DELETE FROM notification_templates a USING notification_templates b
WHERE a.code = b.code AND a.channel = b.channel AND a.language = b.language AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_code_channel_lang ON notification_templates(code, channel, language);
SQL

echo ""
echo "==> Table count:"
psql_exec -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'"

if [ -f "$REPO_DIR/database/audit/expected-tables.txt" ]; then
  echo ""
  echo "==> Missing expected tables:"
  EXISTING=$(psql_exec -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public'" | tr -d '\r')
  MISSING=0
  while IFS= read -r table; do
    [ -z "$table" ] && continue
    [[ "$table" =~ ^# ]] && continue
    if ! echo "$EXISTING" | grep -qx "$table"; then
      echo "   MISSING: $table"
      MISSING=$((MISSING + 1))
    fi
  done < "$REPO_DIR/database/audit/expected-tables.txt"
  if [ "$MISSING" -eq 0 ]; then
    echo "   OK — all expected tables present"
  else
    echo "   WARNING: $MISSING tables still missing"
  fi
fi

if [ "$SKIP_API_RESTART" != "1" ]; then
  echo ""
  echo "==> Restarting API ..."
  if [ -f deploy/docker-compose.vps.yml ]; then
    docker compose -f deploy/docker-compose.vps.yml restart tms-api || true
  elif [ -f deploy/docker-compose.coolify.yml ]; then
    docker compose -f deploy/docker-compose.coolify.yml restart tms-api || true
  fi
fi

echo ""
echo "============================================"
echo " Done."
echo " Health: curl -s http://127.0.0.1:8080/api/health"
echo "============================================"
