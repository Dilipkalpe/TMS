#!/usr/bin/env bash
# Full native Contabo deploy (NO Docker): PostgreSQL + systemd API + Nginx web.
# Run on server as root from repo: bash deploy/deploy-native-contabo.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
API_DIR="${API_DIR:-/var/www/tms/api}"
WEB_DIR="${WEB_DIR:-/var/www/tms/web}"
SERVICE_NAME="${SERVICE_NAME:-tms-api}"
PUBLIC_HOST="${PUBLIC_HOST:-tms.144.91.98.218.nip.io}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tms}"
PG_DB="${PG_DB:-TMSPRO}"
PG_USER="${PG_USER:-postgres}"
# Prefer env TMS_CONNECTION_STRING; otherwise build from local socket/host
CONN_DEFAULT="Host=127.0.0.1;Port=5432;Database=${PG_DB};Username=${PG_USER};Password=${PG_PASSWORD:-};Maximum Pool Size=50"

log() { echo ""; echo "==> $*"; }

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Run as root." >&2
    exit 1
  fi
}

backup_database() {
  log "Database backup (pg_dump)"
  mkdir -p "$BACKUP_DIR"
  local stamp
  stamp="$(date +%Y%m%d_%H%M%S)"
  local out="${BACKUP_DIR}/tms_${PG_DB}_${stamp}.dump"
  # Try common ports: native 5432 then legacy Contabo/Coolify 5433
  if command -v pg_dump >/dev/null 2>&1; then
    if PGPASSWORD="${PG_PASSWORD:-}" pg_dump -h 127.0.0.1 -p 5432 -U "$PG_USER" -Fc -f "$out" "$PG_DB" 2>/dev/null \
      || PGPASSWORD="${PG_PASSWORD:-}" pg_dump -h 127.0.0.1 -p 5433 -U "$PG_USER" -Fc -f "$out" "$PG_DB" 2>/dev/null \
      || sudo -u postgres pg_dump -Fc -f "$out" "$PG_DB" 2>/dev/null; then
      echo "Backup: $out ($(du -h "$out" | awk '{print $1}'))"
    else
      echo "WARNING: pg_dump failed — continuing only if you accept risk. Check DB credentials."
    fi
  else
    echo "WARNING: pg_dump not installed"
  fi
}

disable_old_8080() {
  log "Disable old :8080 deployment (Docker/Coolify/systemd)"
  # Stop common Coolify/docker containers publishing 8080
  if command -v docker >/dev/null 2>&1; then
    docker ps --format '{{.ID}} {{.Ports}} {{.Names}}' | while read -r id ports name; do
      if echo "$ports" | grep -qE ':8080->|0\.0\.0\.0:8080'; then
        echo "Stopping container $name ($id) bound to 8080"
        docker stop "$id" || true
        docker update --restart=no "$id" 2>/dev/null || true
      fi
    done
  fi
  # systemd units that might serve 8080
  for u in tms tms-web tms-docker coolify; do
    systemctl stop "$u" 2>/dev/null || true
    systemctl disable "$u" 2>/dev/null || true
  done
  # Firewall / ensure nothing listens on 8080 after stop
  if ss -tlnp | grep -q ':8080 '; then
    echo "WARNING: something still listening on 8080:"
    ss -tlnp | grep ':8080 ' || true
    # Last resort: kill process holding 8080 (not postgres)
    local pid
    pid="$(ss -tlnp | awk '/:8080 /{print}' | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
    if [[ -n "${pid:-}" ]]; then
      echo "Stopping PID $pid on :8080"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  else
    echo "Port 8080 is free"
  fi
}

ensure_packages() {
  log "Ensure runtime packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq nginx curl ca-certificates
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "Installing .NET 8 runtime/ASP.NET..."
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
    bash /tmp/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /usr/share/dotnet
    ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet
  fi
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
  fi
  if ! command -v psql >/dev/null 2>&1; then
    apt-get install -y -qq postgresql postgresql-contrib
  fi
  systemctl enable --now postgresql || true
}

publish_app() {
  log "Publish API + build frontend"
  cd "$REPO_DIR"
  if [[ -d .git ]]; then
    git fetch --all --prune || true
    git pull --ff-only || true
  fi

  mkdir -p "$API_DIR" "$WEB_DIR"
  dotnet publish backend/Tms.Api/Tms.Api.csproj -c Release -o "$API_DIR"

  # Preserve uploads across publishes
  mkdir -p "$API_DIR/wwwroot/uploads"

  export VITE_API_URL=/api
  npm ci
  npm run build
  rm -rf "${WEB_DIR:?}/"*
  cp -a dist/. "$WEB_DIR/"
  chown -R www-data:www-data "$WEB_DIR" "$API_DIR/wwwroot" 2>/dev/null || true
}

install_systemd() {
  log "Install systemd unit $SERVICE_NAME"
  local jwt_key conn cors
  jwt_key="${TMS_JWT_KEY:-$(openssl rand -base64 48)}"
  conn="${TMS_CONNECTION_STRING:-$CONN_DEFAULT}"
  cors="http://${PUBLIC_HOST}"

  local dotnet_bin
  dotnet_bin="$(command -v dotnet || true)"
  [[ -x /usr/share/dotnet/dotnet ]] && dotnet_bin=/usr/share/dotnet/dotnet
  if [[ -z "${dotnet_bin}" ]] || ! "$dotnet_bin" --list-runtimes 2>/dev/null | grep -qi 'Microsoft.AspNetCore.App 8'; then
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
    bash /tmp/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /usr/share/dotnet
    ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
    dotnet_bin=/usr/share/dotnet/dotnet
  fi

  mkdir -p /etc/tms
  # Preserve production secrets on redeploy unless FORCE_ENV=1 or explicit overrides are passed.
  if [[ -f /etc/tms/tms-api.env && "${FORCE_ENV:-0}" != "1" && -z "${TMS_JWT_KEY:-}" && -z "${TMS_CONNECTION_STRING:-}" ]]; then
    log "Keeping existing /etc/tms/tms-api.env (set FORCE_ENV=1 to regenerate)"
  else
    cat >/etc/tms/tms-api.env <<EOF
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5000
TMS_CONNECTION_STRING=${conn}
TMS_JWT_KEY=${jwt_key}
Cors__Origins__0=${cors}
Database__RunStartupMigrations=true
Database__FailOnMigrationError=false
DemoData__Enabled=false
Gps__AllowSimulator=false
EOF
    chmod 640 /etc/tms/tms-api.env
    chown root:www-data /etc/tms/tms-api.env
  fi

  # Type=simple: ASP.NET does not call sd_notify without UseSystemd(); Type=notify can crash/kill the process.
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
ExecStart=${dotnet_bin} ${API_DIR}/Tms.Api.dll
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStartSec=120
SyslogIdentifier=${SERVICE_NAME}
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

  chown -R www-data:www-data "$API_DIR"
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
  sleep 5
  systemctl --no-pager --full status "$SERVICE_NAME" | head -25 || true
}

install_nginx() {
  log "Configure Nginx for ${PUBLIC_HOST}"
  cp "$REPO_DIR/deploy/nginx-tms-native.conf" /etc/nginx/sites-available/tms
  # Inject server_name if custom domain provided
  if [[ -n "${CUSTOM_DOMAIN:-}" ]]; then
    sed -i "s/server_name .*/server_name ${PUBLIC_HOST} ${CUSTOM_DOMAIN} 144.91.98.218;/" /etc/nginx/sites-available/tms
  fi
  ln -sf /etc/nginx/sites-available/tms /etc/nginx/sites-enabled/tms
  rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/tms-nipio
  nginx -t
  systemctl enable nginx
  systemctl reload nginx
}

try_ssl() {
  if [[ -n "${CUSTOM_DOMAIN:-}" ]] && command -v certbot >/dev/null 2>&1; then
    log "Request Let's Encrypt cert for ${CUSTOM_DOMAIN}"
    certbot --nginx -d "$CUSTOM_DOMAIN" --non-interactive --agree-tos -m "${SSL_EMAIL:-admin@${CUSTOM_DOMAIN}}" || true
  else
    log "SSL: skipped (set CUSTOM_DOMAIN + install certbot for HTTPS). nip.io stays HTTP."
  fi
}

verify() {
  log "Verify"
  echo "-- listeners --"
  ss -tlnp | grep -E ':80 |:443 |:5000 |:8080 |:5432 |:5433 ' || true
  echo "-- health --"
  curl -fsS http://127.0.0.1:5000/api/health || echo "API health FAILED"
  echo ""
  curl -fsSI "http://127.0.0.1/login" | head -5 || true
  if ss -tlnp | grep -q ':8080 '; then
    echo "FAIL: :8080 still listening"
    exit 1
  else
    echo "OK: :8080 disabled"
  fi
}

main() {
  require_root
  backup_database
  ensure_packages
  disable_old_8080
  publish_app
  install_systemd
  install_nginx
  try_ssl
  verify
  log "Deploy complete"
  echo "Frontend: http://${PUBLIC_HOST}/login"
  echo "API:      http://${PUBLIC_HOST}/api/health"
}

main "$@"
