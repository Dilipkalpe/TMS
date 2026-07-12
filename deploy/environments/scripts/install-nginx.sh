#!/usr/bin/env bash
# Install all nginx site configs for IMS, TMS, RMS (prod + demo).
# Run as root from TMS repo root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITES_SRC="$(cd "$SCRIPT_DIR/../nginx/sites" && pwd)"
SITES_AVAIL="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"

if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing nginx..."
  apt-get update && apt-get install -y nginx
fi

mkdir -p "$SITES_AVAIL" "$SITES_ENABLED"

for conf in "$SITES_SRC"/*.conf; do
  name="$(basename "$conf")"
  cp "$conf" "${SITES_AVAIL}/${name}"
  ln -sf "${SITES_AVAIL}/${name}" "${SITES_ENABLED}/${name}"
  echo "  enabled $name"
done

rm -f "${SITES_ENABLED}/default" 2>/dev/null || true

nginx -t
systemctl reload nginx
echo "Nginx reloaded."
