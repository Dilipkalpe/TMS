#!/usr/bin/env bash
# One-command TMS install on Contabo VPS (SSH as root)
# Usage: curl -sSL ... | bash   OR   bash deploy/vps-setup.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
ENV_FILE="$REPO_DIR/deploy/.env"
TMS_URL="${TMS_URL:-http://tms.144.91.98.218.nip.io}"

echo "============================================"
echo " TMS Pro VPS Setup"
echo "============================================"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker not found. Install Docker first or use Coolify."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin not found."
  exit 1
fi

mkdir -p "$(dirname "$REPO_DIR")"
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "==> Cloning repository..."
  git clone https://github.com/Dilipkalpe/TMS.git "$REPO_DIR"
else
  echo "==> Updating repository..."
  git -C "$REPO_DIR" pull --ff-only || true
fi

cd "$REPO_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Creating $ENV_FILE"
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  TMS_JWT_KEY=$(openssl rand -base64 48 | tr -d '\n')
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
TMS_JWT_KEY=$TMS_JWT_KEY
Database__RunStartupMigrations=true
Database__FailOnMigrationError=false
DemoData__Enabled=false
Gps__AllowSimulator=false
Cors__Origins__0=$TMS_URL
TMS_WEB_PORT=8080
EOF
  echo "    Saved secrets to $ENV_FILE"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> Building containers (first time: 10-20 minutes)..."
docker compose -f deploy/docker-compose.vps.yml up -d --build

echo "==> Waiting for health (up to 3 minutes)..."
for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${TMS_WEB_PORT:-8080}/api/health" >/dev/null 2>&1; then
    echo ""
    echo "SUCCESS — TMS is running!"
    curl -s "http://127.0.0.1:${TMS_WEB_PORT:-8080}/api/health"
    echo ""
    break
  fi
  echo -n "."
  sleep 5
  if [ "$i" -eq 36 ]; then
    echo ""
    echo "FAILED — health check timeout. Last logs:"
    docker compose -f deploy/docker-compose.vps.yml logs --tail=50
    exit 1
  fi
done

echo "==> Configuring nginx for $TMS_URL"
if command -v nginx >/dev/null 2>&1; then
  cp deploy/nginx-tms-nipio.conf /etc/nginx/sites-available/tms-nipio
  ln -sf /etc/nginx/sites-available/tms-nipio /etc/nginx/sites-enabled/tms-nipio
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "    nginx configured"
else
  echo "    nginx not installed — use http://$(hostname -I | awk '{print $1}'):8080"
fi

echo ""
echo "============================================"
echo " TMS URLs:"
echo "   $TMS_URL"
echo "   http://127.0.0.1:8080"
echo " Login: admin / admin123"
echo "============================================"
