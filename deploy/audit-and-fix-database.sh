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
echo "==> Applying module SQL (idempotent, in order)..."

# Core only if users table missing
if ! echo "$EXISTING" | grep -qx "users"; then
  echo "-- Core bootstrap"
  run_sql_file database/schema.sql
fi

run_sql_file database/settings_extension.sql
run_sql_file database/core/stored_procedures.sql
run_sql_file database/hr/schema.sql
run_sql_file database/payroll/schema.sql
run_sql_file database/payroll/payroll_hr_extension.sql
run_sql_file database/payroll/accounting_integration.sql
run_sql_file database/maintenance/install.sql
run_sql_file database/modules/schema.sql
run_sql_file database/gps/schema.sql
run_sql_file database/notifications/schema.sql
run_sql_file database/branches/schema.sql
run_sql_file database/portal/schema.sql
run_sql_file database/routing/schema.sql
run_sql_file database/booking_finance/schema.sql
run_sql_file database/reports/report_indexes.sql
run_sql_file database/reports/sp_dashboard_stats.sql
run_sql_file database/reports/sp_accounting_customer_ledger.sql
run_sql_file database/reports/sp_accounting_ledger_report.sql
run_sql_file database/reports/sp_accounting_registers.sql
run_sql_file database/saas/schema.sql
run_sql_file database/saas/tenant_modules.sql
run_sql_file database/saas/tenant_hr_payroll_columns.sql
run_sql_file database/saas/tenant_hr_payroll_procs.sql

# Repair known constraints (GPS + notifications ON CONFLICT)
if [ -f database/gps/schema.sql ]; then
  psql_exec <<'SQL' 2>/dev/null || true
DELETE FROM vehicle_last_position a USING vehicle_last_position b WHERE a.vehicle_id = b.vehicle_id AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_last_position_vehicle_id ON vehicle_last_position(vehicle_id);
DELETE FROM notification_templates a USING notification_templates b
WHERE a.code = b.code AND a.channel = b.channel AND a.language = b.language AND a.ctid < b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_code_channel_lang ON notification_templates(code, channel, language);
SQL
fi

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
