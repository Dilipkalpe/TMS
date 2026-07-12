#!/usr/bin/env bash
# Fix employee save — install correct sp_hr_save_employee + rebuild API.
# Run on VPS: bash deploy/fix-employee-save.sh
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

run_sql_strict() {
  local f="$1"
  echo "  RUN $f"
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f"
}

echo "==> HR schema + tenant columns (if missing)"
for f in \
  database/hr/schema.sql \
  database/hr/employment_types.sql \
  database/saas/tenant_hr_payroll_columns.sql
do
  [ -f "$REPO_DIR/$f" ] && run_sql_strict "$REPO_DIR/$f" || true
done

echo ""
echo "==> Install sp_hr_save_employee (39 args, tenant-aware)"
run_sql_strict "$REPO_DIR/database/hr/install_sp_hr_save_employee.sql"

ARGS=$(docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT pronargs FROM pg_proc WHERE proname = 'sp_hr_save_employee' LIMIT 1")

echo ""
echo "==> sp_hr_save_employee argument count: ${ARGS}"
if [ "${ARGS:-0}" != "39" ]; then
  echo "ERROR: Expected 39 arguments, got ${ARGS:-none}. Fix failed."
  exit 1
fi

echo ""
echo "==> Rebuild API (typed null parameters + latest code)"
chmod +x deploy/force-rebuild.sh
bash deploy/force-rebuild.sh

echo ""
echo "Done. Test: HR -> Employees -> New (code + name required)"
