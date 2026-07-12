#!/usr/bin/env bash
# Fix HR tenant procedures (save, get, list, delete employees) + rebuild API.
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

run_sql_stdin() {
  local f="$1"
  echo "  RUN $f"
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f"
}

run_sql_file() {
  local rel="$1"
  echo "  RUN database/$rel"
  docker exec "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -f "/tmp/tms-database/$rel"
}

echo "==> Copy SQL into postgres container (required for psql \\ir / -f)"
docker cp "$REPO_DIR/database" "$PG:/tmp/tms-database"

echo ""
echo "==> HR schema + tenant columns"
for f in \
  database/hr/schema.sql \
  database/hr/employment_types.sql \
  database/hr/tms_transport_hr.sql \
  database/saas/tenant_hr_payroll_columns.sql
do
  [ -f "$REPO_DIR/$f" ] && run_sql_stdin "$REPO_DIR/$f" || true
done

echo ""
echo "==> Install tenant HR employee procedures (get/save/delete/list)"
run_sql_stdin "$REPO_DIR/database/hr/install_tenant_hr_employee_procs.sql"

echo ""
echo "==> Install full tenant HR + Payroll procedures"
run_sql_file "saas/tenant_hr_payroll_procs.sql"

verify_proc() {
  local name="$1" args="$2"
  local got
  got=$(docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT pronargs FROM pg_proc WHERE proname = '$name' ORDER BY pronargs DESC LIMIT 1")
  echo "  $name -> ${got:-missing} args (expected $args)"
  [ "${got:-0}" = "$args" ]
}

echo ""
echo "==> Verify HR procedures"
verify_proc sp_hr_save_employee 39
SAVE_OK=$?
verify_proc sp_hr_get_employee 2
GET_OK=$?
verify_proc sp_hr_delete_employee 2
DEL_OK=$?

if [ "$SAVE_OK" != 0 ] || [ "$GET_OK" != 0 ] || [ "$DEL_OK" != 0 ]; then
  echo "ERROR: Tenant HR procedures not installed correctly."
  docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT proname, pronargs FROM pg_proc WHERE proname LIKE 'sp_hr_%employee%' ORDER BY 1,2;"
  exit 1
fi

echo ""
echo "==> Rebuild API + Web"
chmod +x deploy/force-rebuild.sh
bash deploy/force-rebuild.sh

echo ""
echo "Done. Test: HR -> Employees -> New and open saved employee."
