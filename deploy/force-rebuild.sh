#!/usr/bin/env bash
# Force full rebuild of API + Web (use when fixes don't appear on live server).
set -euo pipefail
cd "${REPO_DIR:-/var/www/tms}"
git pull --ff-only
docker compose -f deploy/docker-compose.vps.yml build --no-cache tms-api tms-web
docker compose -f deploy/docker-compose.vps.yml up -d tms-api tms-web
echo ""
echo "==> Health check (build tag must be 2026-07-12-hr-employee-save):"
sleep 5
curl -s http://127.0.0.1:8080/api/health || true
echo ""
