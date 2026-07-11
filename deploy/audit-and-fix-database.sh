#!/usr/bin/env bash
# Compare live PostgreSQL to expected TMS schema and apply missing modules.
# Run on VPS: bash deploy/audit-and-fix-database.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
DB_USER="${DB_USER:-tms}"
DB_NAME="${DB_NAME:-tms_pro}"
EXPECTED_FILE="$REPO_DIR/database/audit/expected-tables.txt"

cd "$REPO_DIR"
git pull --ff-only 2>/dev/null || true

PG=$(docker ps -q -f name=postgres | head -1)
if [ -z "$PG" ]; then
  echo "ERROR: postgres container not found. Is TMS stack running?"
  docker ps
  exit 1
fi

psql_exec() {
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

run_sql_file() {
  local f="$1"
  if [ ! -f "$f" ]; then
    echo "  SKIP (file missing): $f"
    return 0
  fi
  echo "  RUN $f"
  psql_exec < "$f" || {
    echo "  WARN: $f had errors (may be partial idempotent re-run)"
    return 0
  }
}

echo "============================================"
echo " TMS Database Audit & Fix"
echo " Database: $DB_NAME @ container $PG"
echo "============================================"

echo ""
echo "==> Current tables in database:"
EXISTING=$(psql_exec -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" | tr -d '\r')
echo "$EXISTING" | wc -l | xargs echo "   Count:"

echo ""
echo "==> Missing tables (expected but not in DB):"
MISSING=0
while IFS= read -r table; do
  [ -z "$table" ] && continue
  [[ "$table" =~ ^# ]] && continue
  if ! echo "$EXISTING" | grep -qx "$table"; then
    echo "   MISSING: $table"
    MISSING=$((MISSING + 1))
  fi
done < "$EXPECTED_FILE"

if [ "$MISSING" -eq 0 ]; then
  echo "   (none — all expected tables exist)"
else
  echo "   Total missing: $MISSING"
fi

echo ""
echo "==> Applying all SQL from database/install-manifest.txt ..."
SKIP_API_RESTART=1 bash "$REPO_DIR/deploy/apply-all-database-sql.sh"

echo ""
echo "==> Re-check missing tables:"
EXISTING2=$(psql_exec -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" | tr -d '\r')
STILL_MISSING=0
while IFS= read -r table; do
  [ -z "$table" ] && continue
  if ! echo "$EXISTING2" | grep -qx "$table"; then
    echo "   STILL MISSING: $table"
    STILL_MISSING=$((STILL_MISSING + 1))
  fi
done < "$EXPECTED_FILE"

if [ "$STILL_MISSING" -eq 0 ]; then
  echo "   OK — all 73 expected tables present"
else
  echo "   WARNING: $STILL_MISSING tables still missing — check errors above"
fi

echo ""
echo "==> Restarting API..."
if [ -f deploy/docker-compose.vps.yml ]; then
  docker compose -f deploy/docker-compose.vps.yml restart tms-api
elif [ -f deploy/docker-compose.coolify.yml ]; then
  docker compose -f deploy/docker-compose.coolify.yml restart tms-api
fi

echo ""
echo "============================================"
echo " Done. Refresh TMS in browser."
echo " Health: curl -s http://127.0.0.1:8080/api/health"
echo "============================================"
