#!/usr/bin/env bash
# Force full rebuild of API + Web (use when fixes don't appear on live server).
set -euo pipefail
cd "${REPO_DIR:-/var/www/tms}"
git checkout -- deploy/verify-deploy.sh deploy/force-rebuild.sh 2>/dev/null || true
git pull --ff-only

# Ensure document_flow column exists before API starts
PG=$(docker ps -q -f name=postgres | head -1 || true)
if [ -n "$PG" ]; then
  if [ -f database/settings_document_flow.sql ]; then
    echo "==> Apply document_flow column"
    docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=1 < database/settings_document_flow.sql || true
  fi
  if [ -f database/settings_extension.sql ]; then
    echo "==> Apply company_settings sequence / multi-tenant id fix"
    docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=1 < database/settings_extension.sql || true
  fi
  if [ -f database/lr/schema.sql ]; then
    echo "==> Apply LR process flow schema"
    docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=0 < database/lr/schema.sql || true
  if [ -f database/lr/consignor_consignee.sql ]; then
    echo "==> Apply Consignor/Consignee master schema"
    docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=0 < database/lr/consignor_consignee.sql || true
  fi
  if [ -f database/lr/business_type.sql ]; then
    echo "==> Apply FTL/PTL business type schema"
    docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=0 < database/lr/business_type.sql || true
  fi
fi

docker compose -f deploy/docker-compose.vps.yml build --no-cache tms-api tms-web
docker compose -f deploy/docker-compose.vps.yml up -d tms-api tms-web
echo ""
echo "==> Health check (build tag must be 2026-08-04-consignor-consignee-master):"
sleep 8
curl -s http://127.0.0.1:8080/api/health || true
echo ""
