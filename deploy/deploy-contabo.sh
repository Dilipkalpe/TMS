#!/usr/bin/env bash
# =============================================================================
# TMS Pro — Contabo VPS deploy script (run ON the Linux server as root)
#
# Server: 144.91.98.218  |  Repo: /var/www/tms
#
# First time on server:
#   cd /var/www/tms && git pull && chmod +x deploy/deploy-contabo.sh
#
# Full deploy (pull + DB patch + rebuild API + Web + verify):
#   bash /var/www/tms/deploy/deploy-contabo.sh
#
# Quick deploy (pull + recreate API only — no image rebuild):
#   bash /var/www/tms/deploy/deploy-contabo.sh --quick
#
# With Gmail SMTP (prompts for app password if omitted):
#   bash /var/www/tms/deploy/deploy-contabo.sh --smtp
#   bash /var/www/tms/deploy/deploy-contabo.sh --smtp --smtp-password 'your-app-password'
#
# From Windows (PowerShell) — SSH then run:
#   ssh root@144.91.98.218
#   bash /var/www/tms/deploy/deploy-contabo.sh
# =============================================================================
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
COMPOSE_FILE="deploy/docker-compose.vps.yml"
CONFIGURE_SMTP=0
QUICK=0
SKIP_PULL=0
SKIP_DB=0
SMTP_EMAIL="${SMTP_EMAIL:-Codeestack@gmail.com}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM_NAME="${SMTP_FROM_NAME:-TMS Pro}"
WEB_PORT="${TMS_WEB_PORT:-8080}"
PUBLIC_IP="${PUBLIC_IP:-144.91.98.218}"

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \?//'
  echo ""
  echo "Options:"
  echo "  --quick              Recreate tms-api only (no docker build)"
  echo "  --full               Force rebuild API + Web (default)"
  echo "  --smtp               Write Gmail SMTP vars to deploy/.env"
  echo "  --smtp-email EMAIL"
  echo "  --smtp-password PASS"
  echo "  --skip-pull          Do not git pull"
  echo "  --skip-db            Skip manual SQL patches"
  echo "  --help               Show this help"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick) QUICK=1; shift ;;
    --full) QUICK=0; shift ;;
    --smtp) CONFIGURE_SMTP=1; shift ;;
    --smtp-email) SMTP_EMAIL="$2"; shift 2 ;;
    --smtp-password) SMTP_PASSWORD="$2"; shift 2 ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    --skip-db) SKIP_DB=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

log() { echo "==> $*"; }

cd "$REPO_DIR"
log "Repo: $REPO_DIR ($(git rev-parse --short HEAD 2>/dev/null || echo 'unknown'))"

if [[ "$SKIP_PULL" -eq 0 ]]; then
  log "git pull --ff-only"
  git pull --ff-only
fi

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

if [[ ! -f deploy/.env ]]; then
  log "WARNING: deploy/.env missing — copy from deploy/.env.production.example"
  if [[ -f deploy/.env.production.example ]]; then
    cp deploy/.env.production.example deploy/.env
    log "Created deploy/.env from example — edit POSTGRES_PASSWORD and TMS_JWT_KEY before production use"
  fi
fi

if [[ "$CONFIGURE_SMTP" -eq 1 ]]; then
  if [[ -z "$SMTP_PASSWORD" ]]; then
    read -r -s -p "Gmail App Password: " SMTP_PASSWORD
    echo
  fi
  log "Writing SMTP settings to deploy/.env"
  upsert_env Notifications__Smtp__Host smtp.gmail.com
  upsert_env Notifications__Smtp__Port 587
  upsert_env Notifications__Smtp__Username "$SMTP_EMAIL"
  upsert_env Notifications__Smtp__Password "$SMTP_PASSWORD"
  upsert_env Notifications__Smtp__From "$SMTP_EMAIL"
  upsert_env Notifications__Smtp__FromName "$SMTP_FROM_NAME"
  upsert_env Notifications__Smtp__UseSsl true
fi

# Ensure startup migrations are enabled
upsert_env Database__RunStartupMigrations true
upsert_env Database__FailOnMigrationError false

apply_sql() {
  local sql_file="$1" label="$2"
  [[ -f "$sql_file" ]] || return 0
  local pg
  pg=$(docker ps -q -f name=postgres | head -1 || true)
  if [[ -z "$pg" ]]; then
    log "Postgres container not running — skip SQL: $label"
    return 0
  fi
  log "Apply SQL: $label"
  docker exec -i "$pg" psql -U tms -d tms_pro -v ON_ERROR_STOP=0 < "$sql_file" || true
}

if [[ "$SKIP_DB" -eq 0 ]]; then
  apply_sql database/settings_extension.sql "company_settings"
  apply_sql database/settings_document_flow.sql "document_flow"
  apply_sql database/lr/schema.sql "LR process flow (loading sheet, transit pass, delivery, expenses)"
fi

ENV_ARGS=()
if [[ -f deploy/.env ]]; then
  ENV_ARGS=(--env-file deploy/.env)
fi

if [[ "$QUICK" -eq 1 ]]; then
  log "Quick deploy — recreate tms-api"
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" up -d --force-recreate tms-api
else
  log "Full deploy — rebuild tms-api + tms-web (may take 5–15 min)"
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" build --no-cache tms-api tms-web
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" up -d tms-api tms-web
fi

log "Waiting for API health (up to 120s)..."
deadline=$((SECONDS + 120))
health_ok=0
while [[ $SECONDS -lt $deadline ]]; do
  if curl -fsS -m 5 "http://127.0.0.1:${WEB_PORT}/api/health" >/tmp/tms-health.json 2>/dev/null; then
    health_ok=1
    break
  fi
  if curl -fsS -m 5 http://127.0.0.1:5000/api/health >/tmp/tms-health.json 2>/dev/null; then
    health_ok=1
    break
  fi
  sleep 5
done

echo ""
if [[ "$health_ok" -eq 1 ]]; then
  log "Health OK:"
  cat /tmp/tms-health.json
  echo ""
else
  log "WARNING: Health check failed — inspect logs:"
  echo "  docker compose -f $COMPOSE_FILE logs --tail=80 tms-api"
fi

# Verify LR process tables (idempotent migration check)
pg=$(docker ps -q -f name=postgres | head -1 || true)
if [[ -n "$pg" ]]; then
  log "LR process schema check:"
  docker exec "$pg" psql -U tms -d tms_pro -t -c "
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('lr_loading_sheets','lr_transit_passes','lr_delivery_sheets','lr_expenses')
    ORDER BY 1;
  " | sed '/^$/d' || true
  docker exec "$pg" psql -U tms -d tms_pro -t -c "
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'lorry_receipts' AND column_name = 'status';
  " | grep -q status && log "lorry_receipts.status column: OK" || log "WARNING: lorry_receipts.status missing"
fi

echo ""
echo "=============================================="
echo " DEPLOY_OK"
echo " Web UI : http://${PUBLIC_IP}:${WEB_PORT}"
echo " Health : http://${PUBLIC_IP}:${WEB_PORT}/api/health"
echo " LR flow: http://${PUBLIC_IP}:${WEB_PORT}/lr  (click LR → Process Flow)"
echo "=============================================="
echo ""
echo "If UI shows old behaviour, hard-refresh browser (Ctrl+Shift+R)."
echo "Logs: docker compose -f $COMPOSE_FILE logs -f tms-api tms-web"
