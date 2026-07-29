#!/usr/bin/env bash
# Run ON Contabo as root (already SSH'd in):
#   bash /var/www/tms/deploy/deploy-on-server.sh
# Or from anywhere:
#   bash /var/www/tms/deploy/deploy-on-server.sh --smtp
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
CONFIGURE_SMTP=0
SMTP_EMAIL="${SMTP_EMAIL:-Codeestack@gmail.com}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM_NAME="${SMTP_FROM_NAME:-TMS Pro}"
QUICK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --smtp) CONFIGURE_SMTP=1; shift ;;
    --smtp-email) SMTP_EMAIL="$2"; shift 2 ;;
    --smtp-password) SMTP_PASSWORD="$2"; shift 2 ;;
    --quick) QUICK=1; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

cd "$REPO_DIR"
echo "==> Repo: $REPO_DIR"
echo "==> git pull"
git pull --ff-only

upsert_env() {
  local key="$1" val="$2" file="deploy/.env"
  mkdir -p deploy
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

if [[ "$CONFIGURE_SMTP" -eq 1 ]]; then
  if [[ -z "$SMTP_PASSWORD" ]]; then
    read -r -s -p "Gmail / App Password: " SMTP_PASSWORD
    echo
  fi
  echo "==> Writing SMTP to deploy/.env"
  upsert_env Notifications__Smtp__Host smtp.gmail.com
  upsert_env Notifications__Smtp__Port 587
  upsert_env Notifications__Smtp__Username "$SMTP_EMAIL"
  upsert_env Notifications__Smtp__Password "$SMTP_PASSWORD"
  upsert_env Notifications__Smtp__From "$SMTP_EMAIL"
  upsert_env Notifications__Smtp__FromName "$SMTP_FROM_NAME"
  upsert_env Notifications__Smtp__UseSsl true
fi

ENV_ARGS=()
if [[ -f deploy/.env ]]; then
  ENV_ARGS=(--env-file deploy/.env)
fi

if [[ "$QUICK" -eq 1 ]]; then
  echo "==> Quick recreate tms-api"
  docker compose -f deploy/docker-compose.vps.yml "${ENV_ARGS[@]}" up -d --force-recreate tms-api
else
  echo "==> Full rebuild API + Web (5-15 min)"
  chmod +x deploy/force-rebuild.sh 2>/dev/null || true
  docker compose -f deploy/docker-compose.vps.yml "${ENV_ARGS[@]}" build --no-cache tms-api tms-web
  docker compose -f deploy/docker-compose.vps.yml "${ENV_ARGS[@]}" up -d tms-api tms-web
fi

echo "==> Waiting for API..."
sleep 12
echo "==> Health:"
curl -fsS http://127.0.0.1:8080/api/health || curl -fsS http://127.0.0.1:5000/api/health || true
echo
echo "DEPLOY_OK"
echo "Open: http://$(hostname -I | awk '{print $1}'):8080"
