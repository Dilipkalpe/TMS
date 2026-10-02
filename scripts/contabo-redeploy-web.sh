#!/usr/bin/env bash
set -euo pipefail

cd /var/www/tms
git fetch origin
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

# Prefer repo root vite build (package.json at /var/www/tms)
if [ -f package.json ]; then
  # Vite is a devDependency — do not use --omit=dev for frontend builds
  npm ci 2>/dev/null || npm install
  npx vite build
  mkdir -p /var/www/tms/web
  rsync -a --delete dist/ /var/www/tms/web/
elif [ -d frontend ]; then
  cd frontend
  npm ci 2>/dev/null || npm install
  npx vite build
  rsync -a --delete dist/ /var/www/tms/web/
else
  echo "No frontend package found"; exit 1
fi

chown -R www-data:www-data /var/www/tms/web
ls -la /var/www/tms/web/index.html
wc -c /var/www/tms/web/index.html
grep -n "mobile-web-app-capable" /var/www/tms/web/index.html || true
echo WEB_DEPLOY_OK
