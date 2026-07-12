#!/usr/bin/env bash
# Create isolated Production + Demo directory layout for IMS, TMS, RMS.
# Run as root on the VPS: sudo bash deploy/environments/scripts/setup-server.sh
set -euo pipefail

APPS=(ims tms rms)
ENVS=(prod demo)
BASE_WWW="/var/www"

echo "==> Creating directory structure under ${BASE_WWW}"

for env in "${ENVS[@]}"; do
  for app in "${APPS[@]}"; do
    root="${BASE_WWW}/${env}/${app}"
    mkdir -p "${root}/uploads" "${root}/logs" "${root}/backups"
    chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "${root}" 2>/dev/null || true
    chmod 750 "${root}/backups"
    echo "  ${root}"
  done
done

echo ""
echo "==> Copy environment templates (edit secrets before deploy)"

copy_env() {
  local env="$1" app="$2"
  local src="deploy/environments/env/${env}.${app}.env.example"
  local dest="/var/www/${env}/${app}/.env"
  if [ -f "$src" ] && [ ! -f "$dest" ]; then
    cp "$src" "$dest"
    echo "  created $dest"
  fi
}

# If run from TMS repo root
if [ -f "deploy/environments/env/prod.tms.env.example" ]; then
  for env in "${ENVS[@]}"; do
    for app in "${APPS[@]}"; do
      copy_env "$env" "$app"
    done
  done
else
  echo "  (run from repo root to auto-copy .env templates)"
fi

echo ""
echo "==> Next steps"
echo "  1. Clone each app repo into /var/www/prod/{app} and /var/www/demo/{app}"
echo "  2. Edit each .env with real passwords and JWT keys"
echo "  3. bash deploy/environments/scripts/install-nginx.sh"
echo "  4. bash deploy/environments/scripts/install-ssl.sh"
echo "  5. bash deploy/environments/scripts/deploy.sh tms demo"
echo "  6. bash deploy/environments/scripts/install-cron.sh"
