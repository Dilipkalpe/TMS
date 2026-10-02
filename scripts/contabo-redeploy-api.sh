#!/usr/bin/env bash
set -euo pipefail

cd /var/www/tms
git fetch origin
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

systemctl stop tms-api
# publish into /var/www/tms/api (WorkingDirectory of service)
dotnet publish /var/www/tms/backend/Tms.Api/Tms.Api.csproj -c Release -o /var/www/tms/api --nologo
# ensure SQL assets available beside DLL
mkdir -p /var/www/tms/api/database
rsync -a --delete /var/www/tms/database/ /var/www/tms/api/database/ || cp -a /var/www/tms/database/. /var/www/tms/api/database/

chown -R www-data:www-data /var/www/tms/api
systemctl start tms-api
sleep 15
systemctl is-active tms-api
curl -fsS --max-time 20 http://127.0.0.1:5000/api/health; echo
journalctl -u tms-api -n 40 --no-pager | grep -iE 'Database ready|schema|Tds|Accounting|GL|error|fail|exception' || true

CODE=$(curl -s -o /tmp/cb.json -w '%{http_code}' --max-time 20 \
  -H 'Host: tms.144.91.98.218.nip.io' \
  'http://127.0.0.1/api/accounting/cash-book' || echo 000)
echo "cash-book HTTP $CODE"
head -c 200 /tmp/cb.json; echo
