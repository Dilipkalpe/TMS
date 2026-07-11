#!/usr/bin/env bash
# TMS Pro — one-shot install on Contabo VPS (run as root after cloning repo)
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/deploy/.env}"

echo "==> TMS Pro Contabo install"
echo "    Repo: $REPO_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker or use Coolify UI (recommended)."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE from example — EDIT secrets before continuing!"
  cp "$REPO_DIR/deploy/.env.production.example" "$ENV_FILE"
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  sed -i "s|REPLACE_WITH_32_PLUS_CHARACTER_SECRET_KEY|$JWT|" "$ENV_FILE"
  echo ""
  echo "IMPORTANT: Set TMS_CONNECTION_STRING in $ENV_FILE"
  echo "Then re-run: bash deploy/install-contabo.sh"
  exit 1
fi

if grep -q "YOUR_PG_HOST\|CHANGE_ME" "$ENV_FILE"; then
  echo "Edit $ENV_FILE — TMS_CONNECTION_STRING and passwords still have placeholders."
  exit 1
fi

cd "$REPO_DIR"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> Building and starting containers..."
docker compose -f deploy/docker-compose.coolify.yml up -d --build

echo "==> Waiting for API health..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${TMS_WEB_PORT:-80}/api/health" >/dev/null 2>&1; then
    echo "OK — TMS is healthy"
    curl -s "http://127.0.0.1:${TMS_WEB_PORT:-80}/api/health"
    echo ""
    echo "Open: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
    exit 0
  fi
  sleep 5
done

echo "Health check timed out. Logs:"
docker compose -f deploy/docker-compose.coolify.yml logs --tail=80
exit 1
