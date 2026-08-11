#!/usr/bin/env bash
# Fix crashed tms-api systemd unit on Contabo (native / no Docker).
# Run as root: bash /var/www/tms/deploy/fix-tms-api-service.sh
set -euo pipefail

API_DIR="${API_DIR:-/var/www/tms/api}"
SERVICE_NAME="${SERVICE_NAME:-tms-api}"
PUBLIC_HOST="${PUBLIC_HOST:-tms.144.91.98.218.nip.io}"

log() { echo "==> $*"; }

log "Diagnostics"
echo "-- systemctl --"
systemctl status "$SERVICE_NAME" --no-pager -l | head -40 || true
echo "-- journal --"
journalctl -u "$SERVICE_NAME" -n 60 --no-pager || true
echo "-- dotnet --"
command -v dotnet || true
dotnet --list-runtimes 2>/dev/null || true
ls -la /usr/bin/dotnet /usr/share/dotnet/dotnet 2>/dev/null || true
ls -la "$API_DIR/Tms.Api.dll" 2>/dev/null || true

DOTNET_BIN="$(command -v dotnet || true)"
if [[ -x /usr/share/dotnet/dotnet ]]; then
  DOTNET_BIN=/usr/share/dotnet/dotnet
elif [[ -z "${DOTNET_BIN}" ]]; then
  log "Installing ASP.NET Core 8 runtime"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /usr/share/dotnet
  ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
  DOTNET_BIN=/usr/share/dotnet/dotnet
fi

if ! "$DOTNET_BIN" --list-runtimes 2>/dev/null | grep -qi 'Microsoft.AspNetCore.App 8'; then
  log "ASP.NET Core 8 runtime missing — installing"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /usr/share/dotnet
  ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
  DOTNET_BIN=/usr/share/dotnet/dotnet
fi

# Recover connection string / jwt from existing unit if present
EXISTING_CONN="$(systemctl show -p Environment "$SERVICE_NAME" 2>/dev/null | tr ' ' '\n' | sed -n 's/^TMS_CONNECTION_STRING=//p' | head -1 || true)"
EXISTING_JWT="$(systemctl show -p Environment "$SERVICE_NAME" 2>/dev/null | tr ' ' '\n' | sed -n 's/^TMS_JWT_KEY=//p' | head -1 || true)"

# Prefer env overrides, then existing unit, then common Contabo ports
CONN="${TMS_CONNECTION_STRING:-${EXISTING_CONN:-}}"
if [[ -z "$CONN" ]]; then
  # Try detect postgres port
  if ss -tln | grep -q ':5433 '; then
    CONN="Host=127.0.0.1;Port=5433;Database=${PG_DB:-TMSPRO};Username=${PG_USER:-postgres};Password=${PG_PASSWORD:-};Maximum Pool Size=50"
  else
    CONN="Host=127.0.0.1;Port=5432;Database=${PG_DB:-tms_pro};Username=${PG_USER:-postgres};Password=${PG_PASSWORD:-};Maximum Pool Size=50"
  fi
fi
JWT="${TMS_JWT_KEY:-${EXISTING_JWT:-$(openssl rand -base64 48)}}"

mkdir -p /etc/tms
cat >/etc/tms/tms-api.env <<EOF
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5000
TMS_CONNECTION_STRING=${CONN}
TMS_JWT_KEY=${JWT}
Cors__Origins__0=http://${PUBLIC_HOST}
Database__RunStartupMigrations=true
Database__FailOnMigrationError=false
DemoData__Enabled=false
Gps__AllowSimulator=false
EOF
chmod 640 /etc/tms/tms-api.env
chown root:www-data /etc/tms/tms-api.env

# Ensure www-data can read publish output
id www-data >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin www-data
chown -R www-data:www-data "$API_DIR"
chmod -R a+rX "$API_DIR"

log "Manual smoke start (10s) as www-data"
set +e
timeout 10s sudo -u www-data env $(grep -v '^#' /etc/tms/tms-api.env | xargs -d '\n') \
  "$DOTNET_BIN" "$API_DIR/Tms.Api.dll" > /tmp/tms-api-smoke.log 2>&1
SMOKE_RC=$?
set -e
echo "smoke exit=$SMOKE_RC (124 = timeout/still running = OK)"
tail -n 40 /tmp/tms-api-smoke.log || true

log "Rewrite systemd unit (Type=simple — avoids notify/core issues)"
cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=TMS Pro API (.NET 8) — native Contabo
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${API_DIR}
EnvironmentFile=/etc/tms/tms-api.env
ExecStart=${DOTNET_BIN} ${API_DIR}/Tms.Api.dll
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStartSec=120
SyslogIdentifier=${SERVICE_NAME}
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 5
systemctl --no-pager --full status "$SERVICE_NAME" | head -30 || true

log "Health check"
curl -fsS http://127.0.0.1:5000/api/health || {
  echo "API health FAILED"
  journalctl -u "$SERVICE_NAME" -n 40 --no-pager || true
  exit 1
}
echo ""
log "tms-api is up"
