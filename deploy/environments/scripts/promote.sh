#!/usr/bin/env bash
# Promote a tested Demo release to Production (same git ref).
# Usage: bash deploy/environments/scripts/promote.sh <tms|ims|rms> [git-ref]
set -euo pipefail

APP="${1:?Usage: promote.sh <tms|ims|rms> [git-ref]}"
GIT_REF="${2:-}"

DEMO_ROOT="/var/www/demo/${APP}"
PROD_ROOT="/var/www/prod/${APP}"

if [ ! -d "$DEMO_ROOT/.git" ]; then
  echo "ERROR: Demo repo not found at $DEMO_ROOT"
  exit 1
fi

if [ -z "$GIT_REF" ]; then
  GIT_REF="$(cd "$DEMO_ROOT" && git rev-parse HEAD)"
fi

echo "================================================"
echo " PROMOTE ${APP^^}: Demo -> Production"
echo " Git ref: ${GIT_REF}"
echo "================================================"
echo ""
read -r -p "Backup production DB first? [Y/n] " bak
if [[ ! "$bak" =~ ^[Nn]$ ]]; then
  bash "$(dirname "$0")/backup.sh" "$APP" prod
fi

echo ""
read -r -p "Deploy ${GIT_REF} to PRODUCTION? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

bash "$(dirname "$0")/deploy.sh" "$APP" prod "$GIT_REF"

echo ""
echo "==> Post-promotion checklist"
echo "  [ ] Smoke test https://${APP}.company.com"
echo "  [ ] Verify /api/health"
echo "  [ ] Check logs: ${PROD_ROOT}/logs"
