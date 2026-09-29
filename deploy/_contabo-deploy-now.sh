#!/usr/bin/env bash
set -euo pipefail
cd /var/www/tms
echo "==> BEFORE"
git rev-parse --short HEAD
git status -sb
git fetch --all --prune
git reset --hard origin/main
git pull --ff-only
echo "==> AFTER"
git rev-parse --short HEAD
git log -1 --oneline
chmod +x deploy/deploy-native-contabo.sh
export PUBLIC_HOST='tms.144.91.98.218.nip.io'
bash deploy/deploy-native-contabo.sh
echo "==> APPLY DRIVER PORTAL / LOCATION SQL"
if sudo -u postgres psql -d TMSPRO -v ON_ERROR_STOP=0 -f database/gps/driver_portal.sql; then
  echo "Applied driver_portal to TMSPRO"
elif sudo -u postgres psql -d tms_pro -v ON_ERROR_STOP=0 -f database/gps/driver_portal.sql; then
  echo "Applied driver_portal to tms_pro"
else
  echo "SQL apply skipped/failed (will rely on API EnsureDriverPortal)"
fi
echo "==> APPLY EXPENSE ATTACHMENTS SQL"
if sudo -u postgres psql -d TMSPRO -v ON_ERROR_STOP=0 -f database/expenses/attachments.sql; then
  echo "Applied expense_attachments to TMSPRO"
elif sudo -u postgres psql -d tms_pro -v ON_ERROR_STOP=0 -f database/expenses/attachments.sql; then
  echo "Applied expense_attachments to tms_pro"
else
  echo "expense_attachments SQL skipped (API migrator will create)"
fi
echo "==> VERIFY portal / location / attachments"
sudo -u postgres psql -d tms_pro -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='drivers' AND column_name LIKE 'portal_%' ORDER BY 1;" || true
sudo -u postgres psql -d tms_pro -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='vehicle_last_position' AND column_name IN ('location_label','geocoded_lat','geocoded_lng') ORDER BY 1;" || true
sudo -u postgres psql -d tms_pro -tAc "SELECT tablename FROM pg_tables WHERE tablename='expense_attachments';" || true
echo "==> HEALTH"
curl -fsS http://127.0.0.1:5000/api/health || true
echo
curl -fsSI http://127.0.0.1/driver/login | head -5 || true
curl -fsSI http://127.0.0.1/expenses/new | head -5 || true
systemctl --no-pager --full status tms-api | head -20 || true
echo "==> DONE"
