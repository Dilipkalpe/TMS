#!/usr/bin/env bash
# Native deploy (no Docker): pull, publish API, build web, restart systemd service.
# Run on Linux server: bash /var/www/tms/deploy/deploy-on-server.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
API_DIR="${API_DIR:-/var/www/tms/api}"
WEB_DIR="${WEB_DIR:-/var/www/tms/web}"
SERVICE_NAME="${SERVICE_NAME:-tms-api}"
DOTNET_BIN="${DOTNET_BIN:-/usr/share/dotnet/dotnet}"
[[ -x "$DOTNET_BIN" ]] || DOTNET_BIN="$(command -v dotnet)"

log() { echo "==> $*"; }

cd "$REPO_DIR"
log "Repo: $REPO_DIR ($(git rev-parse --short HEAD 2>/dev/null || echo 'unknown'))"
git fetch --all --prune 2>/dev/null || true
git pull --ff-only

export DOTNET_ROOT="${DOTNET_ROOT:-/usr/share/dotnet}"
export PATH="$DOTNET_ROOT:$PATH"

log "Publish API"
"$DOTNET_BIN" publish backend/Tms.Api/Tms.Api.csproj -c Release -o "$API_DIR"
if [[ -d "$REPO_DIR/database" ]]; then
  rm -rf "$API_DIR/database"
  cp -a "$REPO_DIR/database" "$API_DIR/database"
fi
mkdir -p "$API_DIR/wwwroot/uploads"

log "Build web"
export VITE_API_URL=/api
npm ci
npm run build
rm -rf "${WEB_DIR:?}/"*
mkdir -p "$WEB_DIR"
cp -a dist/. "$WEB_DIR/"
chown -R www-data:www-data "$API_DIR" "$WEB_DIR" 2>/dev/null || true

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null || systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
  log "Restart $SERVICE_NAME"
  systemctl reset-failed "$SERVICE_NAME" || true
  systemctl restart "$SERVICE_NAME"
else
  log "Service $SERVICE_NAME not installed — run bootstrap-native-full.sh first"
fi

log "Health check"
sleep 8
curl -fsS http://127.0.0.1:5000/api/health || { journalctl -u "$SERVICE_NAME" -n 40 --no-pager; exit 1; }
echo ""
log "Done ($(git rev-parse --short HEAD))"
