#!/usr/bin/env bash
# Fix maintenance module on VPS — run: bash deploy/fix-maintenance.sh
set -euo pipefail
REPO_DIR="${REPO_DIR:-/var/www/tms}"
cd "$REPO_DIR"
git pull --ff-only 2>/dev/null || true

PG=$(docker ps -q -f name=postgres | head -1)
if [ -z "$PG" ]; then
  echo "ERROR: postgres container not found"
  docker ps
  exit 1
fi

echo "==> Installing maintenance schema..."
docker exec -i "$PG" psql -U tms -d tms_pro < database/maintenance/install.sql

echo "==> Restarting API..."
docker compose -f deploy/docker-compose.vps.yml restart tms-api

echo "==> Done. Open Maintenance module in TMS."
echo "    Test: curl -s http://127.0.0.1:8080/api/maintenance/overview -H 'Authorization: Bearer YOUR_TOKEN'"
