#!/usr/bin/env bash
# Install separate cron jobs for prod/demo backups (IMS, TMS, RMS).
# Run as root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"
CRON_FILE="/etc/cron.d/erp-backups"

cat > "$CRON_FILE" <<EOF
# ERP isolated backups — Production (02:00) and Demo (03:00) IST ~= UTC+5:30
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Production — daily 02:30
30 2 * * * root ${BACKUP_SCRIPT} tms prod >> /var/log/erp-backup-prod-tms.log 2>&1
35 2 * * * root ${BACKUP_SCRIPT} ims prod >> /var/log/erp-backup-prod-ims.log 2>&1
40 2 * * * root ${BACKUP_SCRIPT} rms prod >> /var/log/erp-backup-prod-rms.log 2>&1

# Demo — daily 03:30
30 3 * * * root ${BACKUP_SCRIPT} tms demo >> /var/log/erp-backup-demo-tms.log 2>&1
35 3 * * * root ${BACKUP_SCRIPT} ims demo >> /var/log/erp-backup-demo-ims.log 2>&1
40 3 * * * root ${BACKUP_SCRIPT} rms demo >> /var/log/erp-backup-demo-rms.log 2>&1
EOF

chmod 644 "$CRON_FILE"
echo "Installed $CRON_FILE"
echo "Logs: /var/log/erp-backup-*.log"
