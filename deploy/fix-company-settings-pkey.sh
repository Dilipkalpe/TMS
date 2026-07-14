#!/usr/bin/env bash
# Hotfix: company_settings_pkey duplicate on Settings save (legacy id DEFAULT 1).
# Run on VPS: bash deploy/fix-company-settings-pkey.sh
set -euo pipefail
cd "${REPO_DIR:-/var/www/tms}"

PG=$(docker ps -q -f name=postgres | head -1 || true)
if [ -z "$PG" ]; then
  echo "No postgres container found."
  exit 1
fi

echo "==> Current company_settings rows"
docker exec -i "$PG" psql -U tms -d tms_pro -c \
  "SELECT id, company_id, company_name, document_flow FROM company_settings ORDER BY id;"

echo "==> Apply settings_extension (sequence + drop id=1 check)"
docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=1 < database/settings_extension.sql

echo "==> Attach orphan / empty company_id to first company (if needed)"
docker exec -i "$PG" psql -U tms -d tms_pro -v ON_ERROR_STOP=1 <<'SQL'
UPDATE company_settings cs
SET company_id = COALESCE(
  (SELECT id FROM companies ORDER BY created_at NULLS LAST, id LIMIT 1),
  '00000000-0000-4000-8000-000000000001'::uuid
)
WHERE company_id IS NULL
   OR company_id = '00000000-0000-0000-0000-000000000000'::uuid;

SELECT id, company_id, company_name, document_flow,
       pg_get_expr(d.adbin, d.adrelid) AS id_default
FROM company_settings cs
LEFT JOIN pg_attrdef d ON d.adrelid = 'company_settings'::regclass
LEFT JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum AND a.attname = 'id'
ORDER BY cs.id;
SQL

echo "==> Done. Save Settings again (rebuild API if code still inserts blindly)."
