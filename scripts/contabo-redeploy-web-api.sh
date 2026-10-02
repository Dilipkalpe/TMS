#!/usr/bin/env bash
set -euo pipefail

cd /var/www/tms
git fetch origin
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

echo "== Publish API"
systemctl stop tms-api || true
dotnet publish /var/www/tms/backend/Tms.Api/Tms.Api.csproj -c Release -o /var/www/tms/api --nologo
mkdir -p /var/www/tms/api/database
rsync -a /var/www/tms/database/ /var/www/tms/api/database/ || true
chown -R www-data:www-data /var/www/tms/api
systemctl start tms-api

echo "== Build web"
npm install
npm run build
rsync -a --delete dist/ /var/www/tms/web/
chown -R www-data:www-data /var/www/tms/web

sleep 12
systemctl is-active tms-api
curl -fsS --max-time 15 http://127.0.0.1:5000/api/health; echo
ls -la /var/www/tms/web/index.html
grep -o 'accounting-[^"]*\.js\|index-[^"]*\.js' /var/www/tms/web/index.html | head -5
echo DEPLOY_OK
