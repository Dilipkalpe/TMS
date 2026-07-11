#!/usr/bin/env bash
# Fix customer portal login — seed demo customers + portal PINs on live DB.
# Run on VPS: bash deploy/fix-portal-login.sh
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

echo "==> Portal schema"
run_sql "$REPO_DIR/database/portal/schema.sql"

echo "==> Demo customers + bookings (if missing)"
run_sql "$REPO_DIR/database/seed.sql"

echo "==> Portal demo logins (phone + PIN)"
run_sql "$REPO_DIR/database/portal/seed_demo_portal.sql"

echo ""
echo "==> Portal-enabled customers:"
docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT id, name, portal_phone, portal_enabled FROM customers WHERE portal_enabled = true ORDER BY id;"

echo ""
echo "==> Restart API (re-seeds portal via DbSeeder if needed)"
docker compose -f deploy/docker-compose.vps.yml restart tms-api 2>/dev/null || \
  docker compose -f deploy/docker-compose.coolify.yml restart tms-api 2>/dev/null || true

echo ""
echo "Done. Demo logins:"
echo "  HO-MUM: 9820012345 / PIN 123456"
echo "  PUN:    9820045678 / PIN 234567"
echo "  DEL:    9820023456 / PIN 345678"
echo "URL: http://tms.144.91.98.218.nip.io/portal/login"
