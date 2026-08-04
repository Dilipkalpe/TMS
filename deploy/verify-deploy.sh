#!/usr/bin/env bash
# Verify what version is running on Contabo — run from repo root:
#   bash deploy/verify-deploy.sh
set -euo pipefail

WEB_PORT="${TMS_WEB_PORT:-8080}"
EXPECTED_BUILD="${EXPECTED_BUILD:-2026-08-04-consignor-consignee-master}"

echo "=== Git (local repo on server) ==="
git rev-parse --short HEAD 2>/dev/null || echo "Not a git repo"
git log -1 --oneline 2>/dev/null || true

echo ""
echo "=== Docker containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null | grep -E 'tms|NAMES' || echo "No TMS containers"

echo ""
echo "=== API health ==="
HEALTH=$(curl -fsS -m 10 "http://127.0.0.1:${WEB_PORT}/api/health" 2>/dev/null || curl -fsS -m 10 http://127.0.0.1:5000/api/health 2>/dev/null || echo '{"error":"unreachable"}')
echo "$HEALTH" | head -c 500
echo ""

BUILD=$(echo "$HEALTH" | grep -o '"build":"[^"]*"' | cut -d'"' -f4 || true)
if [[ "$BUILD" == "$EXPECTED_BUILD" ]]; then
  echo "OK — running expected build: $BUILD"
else
  echo "MISMATCH — expected build '$EXPECTED_BUILD', got '${BUILD:-none}'"
  echo "Run: cd /var/www/tms && git pull && bash deploy/deploy-contabo.sh"
fi

echo ""
echo "=== LR schema (postgres) ==="
PG=$(docker ps -q -f name=postgres | head -1 || true)
if [[ -n "$PG" ]]; then
  docker exec "$PG" psql -U tms -d tms_pro -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'lr_loading_sheets';" 2>/dev/null | tr -d ' '
  echo " lr_loading_sheets table (1 = OK)"
else
  echo "Postgres container not found"
fi
