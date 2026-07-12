#!/usr/bin/env bash
# Issue Let's Encrypt certificates for all app domains.
# Prerequisites: DNS A records must point to this server.
# Usage: sudo bash deploy/environments/scripts/install-ssl.sh [email]
set -euo pipefail

EMAIL="${1:-admin@company.com}"

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

DOMAINS=(
  ims.company.com api-ims.company.com
  tms.company.com api-tms.company.com
  rms.company.com api-rms.company.com
  demo-ims.company.com demo-api-ims.company.com
  demo-tms.company.com demo-api-tms.company.com
  demo-rms.company.com demo-api-rms.company.com
)

for domain in "${DOMAINS[@]}"; do
  echo "==> Certificate: $domain"
  certbot certonly --nginx -d "$domain" --non-interactive --agree-tos -m "$EMAIL" \
    || echo "  (skipped — DNS may not be ready for $domain)"
done

systemctl reload nginx
echo "Done. Certificates renew via certbot timer."
