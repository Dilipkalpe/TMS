#!/usr/bin/env bash
# Complete native Contabo bootstrap (NO Docker):
# packages → native PostgreSQL → restore dump (optional) → publish API → build web → systemd → nginx → ufw
# Run as root: bash /var/www/tms/deploy/bootstrap-native-full.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
API_DIR="${API_DIR:-/var/www/tms/api}"
WEB_DIR="${WEB_DIR:-/var/www/tms/web}"
SERVICE_NAME="${SERVICE_NAME:-tms-api}"
PUBLIC_HOST="${PUBLIC_HOST:-tms.144.91.98.218.nip.io}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tms}"
DUMP_FILE="${DUMP_FILE:-}"
# Common default if operator uploaded local dump to /root
if [[ -z "$DUMP_FILE" && -f /root/tms_pro_local.dump ]]; then
  DUMP_FILE=/root/tms_pro_local.dump
fi
PG_DB="${PG_DB:-tms_pro}"
PG_APP_USER="${PG_APP_USER:-tms}"
ENV_FILE="/etc/tms/tms-api.env"

log() { echo ""; echo "==> $*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Run as root"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
log "Install packages"
apt-get update -qq
apt-get install -y -qq nginx curl ca-certificates ufw git openssl postgresql postgresql-contrib

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE 'v(1[8-9]|2[0-9])'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

DOTNET_BIN=/usr/share/dotnet/dotnet
# SDK required for `dotnet publish`; ASP.NET runtime required to run the app
if [[ ! -x "$DOTNET_BIN" ]] || ! "$DOTNET_BIN" --list-sdks 2>/dev/null | grep -qE '^8\.'; then
  log "Install .NET 8 SDK (needed for publish)"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 8.0 --install-dir /usr/share/dotnet
  ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
fi
if ! "$DOTNET_BIN" --list-runtimes 2>/dev/null | grep -qi 'Microsoft.AspNetCore.App 8'; then
  log "Install ASP.NET Core 8 runtime"
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel 8.0 --runtime aspnetcore --install-dir /usr/share/dotnet
  ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
fi
export DOTNET_ROOT=/usr/share/dotnet
export PATH="$DOTNET_ROOT:$PATH"
DOTNET_BIN=/usr/share/dotnet/dotnet
[[ -x /usr/bin/dotnet ]] || ln -sfn /usr/share/dotnet/dotnet /usr/bin/dotnet
"$DOTNET_BIN" --list-sdks || true
"$DOTNET_BIN" --list-runtimes || true

log "Disable Docker :8080 app (keep Docker Postgres alone if present — we use native PG)"
if command -v docker >/dev/null 2>&1; then
  docker ps --format '{{.ID}} {{.Ports}} {{.Names}}' | while read -r id ports name; do
    if echo "$ports" | grep -qE ':8080->|0\.0\.0\.0:8080'; then
      echo "Stopping $name ($id) on :8080"
      docker update --restart=no "$id" 2>/dev/null || true
      docker stop "$id" || true
    fi
  done
fi
# Free 8080 if anything else holds it
if ss -tlnp | grep -q ':8080 '; then
  pid="$(ss -tlnp | awk '/:8080 /{print}' | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
  [[ -n "${pid:-}" ]] && kill "$pid" 2>/dev/null || true
fi

log "Ensure native PostgreSQL on 5432"
systemctl enable --now postgresql
# Wait for socket
sleep 2

# App role + DB — reuse existing password on re-run so env/DB stay in sync
if [[ -z "${PG_APP_PASSWORD:-}" && -f /etc/tms/db.credentials ]]; then
  # shellcheck disable=SC1091
  source /etc/tms/db.credentials
  PG_APP_PASSWORD="${PG_APP_PASSWORD:-}"
fi
if [[ -z "${PG_APP_PASSWORD:-}" ]]; then
  PG_APP_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
fi
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PG_APP_USER}') THEN
    CREATE ROLE ${PG_APP_USER} LOGIN PASSWORD '${PG_APP_PASSWORD}';
  ELSE
    ALTER ROLE ${PG_APP_USER} WITH LOGIN PASSWORD '${PG_APP_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${PG_DB} OWNER ${PG_APP_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PG_DB}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_APP_USER};
SQL

# Allow local md5/scram for app user (default peer for local socket still used by postgres OS user)
PG_HBA="$(sudo -u postgres psql -tAc "SHOW hba_file")"
if [[ -n "$PG_HBA" ]] && ! grep -q "tms_pro\|${PG_APP_USER}" "$PG_HBA" 2>/dev/null; then
  echo "host ${PG_DB} ${PG_APP_USER} 127.0.0.1/32 scram-sha-256" >> "$PG_HBA"
  echo "host ${PG_DB} ${PG_APP_USER} ::1/128 scram-sha-256" >> "$PG_HBA"
  systemctl reload postgresql || systemctl restart postgresql
fi

mkdir -p "$BACKUP_DIR" /etc/tms
CONN="Host=127.0.0.1;Port=5432;Database=${PG_DB};Username=${PG_APP_USER};Password=${PG_APP_PASSWORD}"

if [[ -n "$DUMP_FILE" && -f "$DUMP_FILE" ]]; then
  log "Backup existing Contabo ${PG_DB} (if any) then restore dump"
  stamp="$(date +%Y%m%d_%H%M%S)"
  sudo -u postgres pg_dump -Fc -f "${BACKUP_DIR}/pre_restore_${PG_DB}_${stamp}.dump" "$PG_DB" 2>/dev/null || true
  # Restore as postgres then reassign ownership
  sudo -u postgres pg_restore --clean --if-exists --no-owner --role="${PG_APP_USER}" -d "$PG_DB" "$DUMP_FILE" \
    || sudo -u postgres pg_restore --no-owner --role="${PG_APP_USER}" -d "$PG_DB" "$DUMP_FILE" || true
  sudo -u postgres psql -d "$PG_DB" -c "ALTER DATABASE ${PG_DB} OWNER TO ${PG_APP_USER};"
  sudo -u postgres psql -d "$PG_DB" -c "GRANT ALL ON SCHEMA public TO ${PG_APP_USER};"
  sudo -u postgres psql -d "$PG_DB" -c "ALTER SCHEMA public OWNER TO ${PG_APP_USER};"
  echo "Restore attempted from $DUMP_FILE"
else
  log "No DUMP_FILE — keeping existing DB (or empty). Set DUMP_FILE=/path/to/tms_pro.dump to migrate."
fi

# Persist secrets
JWT_KEY="${TMS_JWT_KEY:-$(openssl rand -base64 48)}"
CORS_ORIGIN="http://${PUBLIC_HOST}"
[[ -n "$CUSTOM_DOMAIN" ]] && CORS_ORIGIN="https://${CUSTOM_DOMAIN}"

cat >"$ENV_FILE" <<EOF
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5000
TMS_CONNECTION_STRING=${CONN}
TMS_JWT_KEY=${JWT_KEY}
Cors__Origins__0=${CORS_ORIGIN}
Database__RunStartupMigrations=${RUN_MIGRATIONS:-true}
Database__FailOnMigrationError=false
DemoData__Enabled=false
Gps__AllowSimulator=false
EOF
chmod 640 "$ENV_FILE"
chown root:www-data "$ENV_FILE"
# Also save DB password for ops (root only)
umask 077
echo "PG_APP_USER=${PG_APP_USER}" > /etc/tms/db.credentials
echo "PG_APP_PASSWORD=${PG_APP_PASSWORD}" >> /etc/tms/db.credentials
echo "PG_DB=${PG_DB}" >> /etc/tms/db.credentials
chmod 600 /etc/tms/db.credentials

log "Publish API + build frontend"
cd "$REPO_DIR"
git fetch --all --prune 2>/dev/null || true
git pull --ff-only 2>/dev/null || true

id www-data >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin www-data
mkdir -p "$API_DIR" "$WEB_DIR"
"$DOTNET_BIN" publish backend/Tms.Api/Tms.Api.csproj -c Release -o "$API_DIR"
# Schema migrators resolve database/*.sql relative to ContentRoot (publish dir)
if [[ -d "$REPO_DIR/database" ]]; then
  rm -rf "$API_DIR/database"
  cp -a "$REPO_DIR/database" "$API_DIR/database"
elif [[ -d "$REPO_DIR/backend/database" ]]; then
  rm -rf "$API_DIR/database"
  cp -a "$REPO_DIR/backend/database" "$API_DIR/database"
fi
mkdir -p "$API_DIR/wwwroot/uploads"
export VITE_API_URL=/api
npm ci
npm run build
rm -rf "${WEB_DIR:?}/"*
cp -a dist/. "$WEB_DIR/"
chown -R www-data:www-data "$API_DIR" "$WEB_DIR"

log "Install systemd ${SERVICE_NAME}"
cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=TMS Pro API (.NET 8) native
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${API_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${DOTNET_BIN} ${API_DIR}/Tms.Api.dll
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStartSec=180
SyslogIdentifier=${SERVICE_NAME}
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

log "Configure Nginx"
SERVER_NAMES="${PUBLIC_HOST} 144.91.98.218"
[[ -n "$CUSTOM_DOMAIN" ]] && SERVER_NAMES="${CUSTOM_DOMAIN} ${SERVER_NAMES}"
cat >/etc/nginx/sites-available/tms <<EOF
upstream tms_api {
    server 127.0.0.1:5000;
    keepalive 32;
}
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAMES};
    root ${WEB_DIR};
    index index.html;
    client_max_body_size 20M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location /api/ {
        proxy_pass http://tms_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
    location /uploads/ {
        alias ${API_DIR}/wwwroot/uploads/;
        expires 7d;
    }
    location /assets/ {
        try_files \$uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sf /etc/nginx/sites-available/tms /etc/nginx/sites-enabled/tms
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/tms-nipio
nginx -t
systemctl enable nginx
systemctl reload nginx

if [[ -n "$CUSTOM_DOMAIN" ]] && command -v certbot >/dev/null 2>&1; then
  log "SSL for ${CUSTOM_DOMAIN}"
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d "$CUSTOM_DOMAIN" --non-interactive --agree-tos -m "admin@${CUSTOM_DOMAIN}" || true
elif [[ -n "$CUSTOM_DOMAIN" ]]; then
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx -d "$CUSTOM_DOMAIN" --non-interactive --agree-tos -m "admin@${CUSTOM_DOMAIN}" || true
fi

log "UFW firewall"
ufw allow OpenSSH || ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

sleep 6
log "Verify"
systemctl --no-pager status "$SERVICE_NAME" | head -20 || true
ss -tlnp | grep -E ':80 |:443 |:5000 |:8080 |:5432 ' || true
curl -fsS http://127.0.0.1:5000/api/health || { journalctl -u "$SERVICE_NAME" -n 40 --no-pager; exit 1; }
echo ""
if ss -tlnp | grep -q ':8080 '; then echo "WARN: :8080 still listening"; else echo "OK: :8080 disabled"; fi

log "DONE"
echo "Frontend: http://${PUBLIC_HOST}/login"
[[ -n "$CUSTOM_DOMAIN" ]] && echo "Domain:   https://${CUSTOM_DOMAIN}/login (if certbot OK)"
echo "API:      http://${PUBLIC_HOST}/api/health"
echo "DB creds: /etc/tms/db.credentials (root only)"
echo "API env:  ${ENV_FILE}"
