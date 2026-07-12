#!/usr/bin/env bash
# Install HR + Payroll tables and stored procedures on live PostgreSQL.
# Run on VPS: bash deploy/fix-hr-payroll.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
DB_USER="${DB_USER:-tms}"
DB_NAME="${DB_NAME:-tms_pro}"

cd "$REPO_DIR"
git pull --ff-only 2>/dev/null || true

PG=$(docker ps -q -f name=postgres | head -1)
if [ -z "$PG" ]; then
  echo "ERROR: postgres container not found"
  exit 1
fi

run_sql() {
  local f="$1"
  echo "  RUN $f"
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 < "$f" || true
}

echo "==> HR + Payroll database install"
for f in \
  database/hr/schema.sql \
  database/payroll/schema.sql \
  database/hr/employment_types.sql \
  database/hr/upgrade_drop_employee_sp.sql \
  database/hr/stored_procedures.sql \
  database/payroll/upgrade_drop_functions.sql \
  database/payroll/stored_procedures.sql \
  database/payroll/accounting_integration.sql \
  database/payroll/payroll_hr_extension.sql \
  database/payroll/payroll_accounting_sp.sql \
  database/hr/employment_hr_sp.sql \
  database/payroll/upgrade_drop_transport.sql \
  database/payroll/employment_payroll.sql \
  database/hr/tms_transport_hr.sql \
  database/payroll/tms_transport_payroll.sql \
  database/saas/tenant_hr_payroll_columns.sql \
  database/saas/tenant_hr_payroll_procs.sql
do
  run_sql "$REPO_DIR/$f"
done

echo ""
echo "==> Verify sp_hr_save_employee:"
docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT p.proname || '(' || p.pronargs || ' args)' FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'sp_hr_save_employee'"

echo ""
echo "==> Verify other HR procedures:"
docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT proname || '(' || pronargs || ')' FROM pg_proc WHERE proname IN ('sp_hr_summary','sp_hr_list_employees_paged','sp_payroll_summary','sp_payroll_list_settings') ORDER BY 1"

echo ""
echo "==> Restart API"
docker compose -f deploy/docker-compose.vps.yml restart tms-api 2>/dev/null || \
  docker compose -f deploy/docker-compose.coolify.yml restart tms-api 2>/dev/null || true

echo "Done. Rebuild web if frontend was updated: docker compose -f deploy/docker-compose.vps.yml up -d --build tms-web"
