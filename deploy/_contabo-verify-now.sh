#!/usr/bin/env bash
set -euo pipefail

echo "==> commit"
git -C /var/www/tms rev-parse --short HEAD
git -C /var/www/tms log -1 --oneline

echo "==> health local"
curl -sS --max-time 10 http://127.0.0.1:5000/api/health || echo "LOCAL_HEALTH_FAIL"
echo

echo "==> nginx health"
curl -sS --max-time 10 -o /tmp/h.txt -w "HTTP %{http_code}\n" http://tms.144.91.98.218.nip.io/api/health
cat /tmp/h.txt
echo

echo "==> driver login"
curl -sS --max-time 10 -o /tmp/d.html -w "HTTP %{http_code} size=%{size_download}\n" http://tms.144.91.98.218.nip.io/driver/login
head -c 200 /tmp/d.html; echo

echo "==> portal columns"
sudo -u postgres psql -d tms_pro -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='drivers' AND column_name LIKE 'portal%' ORDER BY 1"

echo "==> portal tables"
sudo -u postgres psql -d tms_pro -tAc "SELECT tablename FROM pg_tables WHERE tablename IN ('driver_trip_sessions','driver_trip_status_history') ORDER BY 1"

echo "==> vlp cols"
sudo -u postgres psql -d tms_pro -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='vehicle_last_position' AND column_name IN ('driver_id','loading_slip_id','tracking_status','accuracy_meters') ORDER BY 1"

echo "==> dll"
ls -la /var/www/tms/api/Tms.Api.dll

echo "==> service"
systemctl is-active tms-api
systemctl is-active nginx

echo "==> DONE"
