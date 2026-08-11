#!/usr/bin/env bash
# Restore dump into native PG and restart tms-api.
# Prefers plain SQL (PG16-compatible). Custom -Fc from PG18 will fail on PG16.
set -euo pipefail

DUMP="${DUMP_FILE:-}"
if [[ -z "$DUMP" ]]; then
  for cand in /root/tms_pro_pg16.sql /root/tms_pro_local.sql /root/tms_pro_local.dump; do
    [[ -f "$cand" ]] && DUMP="$cand" && break
  done
fi
[[ -n "$DUMP" && -f "$DUMP" ]] || { echo "Missing dump. Set DUMP_FILE=..."; exit 1; }
[[ -f /etc/tms/db.credentials ]] || { echo "Missing /etc/tms/db.credentials"; exit 1; }
# shellcheck disable=SC1091
source /etc/tms/db.credentials

echo "Restoring into ${PG_DB} as ${PG_APP_USER} from ${DUMP}"
systemctl stop tms-api || true

mkdir -p /var/backups/tms
stamp="$(date +%Y%m%d_%H%M%S)"
sudo -u postgres pg_dump -Fc -f "/var/backups/tms/pre_restore_${PG_DB}_${stamp}.dump" "$PG_DB" 2>/dev/null || true

sudo -u postgres dropdb --if-exists "$PG_DB"
sudo -u postgres createdb -O "$PG_APP_USER" "$PG_DB"

STAGE="/var/backups/tms/restore_in_${stamp}"
if [[ "$DUMP" == *.sql ]]; then
  # Strip PG17+/18-only dump directives so restore works on Ubuntu PG16
  sed -E '/^\\restrict /d;/^\\unrestrict /d;/transaction_timeout/d' "$DUMP" > "${STAGE}.sql"
  chown postgres:postgres "${STAGE}.sql"
  chmod 644 "${STAGE}.sql"
  sudo -u postgres psql -d "$PG_DB" -v ON_ERROR_STOP=0 -f "${STAGE}.sql"
  rm -f "${STAGE}.sql"
else
  cp -f "$DUMP" "${STAGE}.dump"
  chmod 644 "${STAGE}.dump"
  chown postgres:postgres "${STAGE}.dump"
  sudo -u postgres pg_restore --no-owner --role="$PG_APP_USER" -d "$PG_DB" "${STAGE}.dump" || true
  rm -f "${STAGE}.dump"
fi

# Do not REASSIGN OWNED BY postgres (fails on system catalogs). Own public objects only.
sudo -u postgres psql -d "$PG_DB" -v ON_ERROR_STOP=1 <<SQL
ALTER DATABASE ${PG_DB} OWNER TO ${PG_APP_USER};
ALTER SCHEMA public OWNER TO ${PG_APP_USER};
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO ${PG_APP_USER}', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO ${PG_APP_USER}', r.sequence_name);
  END LOOP;
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO ${PG_APP_USER}', r.proname, r.args);
  END LOOP;
END
\$\$;
GRANT ALL ON SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO ${PG_APP_USER};
SQL

echo -n "public tables: "
sudo -u postgres psql -d "$PG_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
echo -n "users relation: "
sudo -u postgres psql -d "$PG_DB" -tAc "SELECT to_regclass('public.users');"

systemctl reset-failed tms-api || true
systemctl restart tms-api
sleep 12
systemctl --no-pager --full status tms-api | head -30
curl -fsS http://127.0.0.1:5000/api/health
echo ""
curl -fsSI http://127.0.0.1/login | head -12 || true
if ss -tlnp | grep -q ':8080 '; then echo "WARN: :8080 still listening"; else echo "OK: :8080 disabled"; fi
ss -tlnp | grep -E ':80 |:5000 |:5432 ' || true
echo "DONE"
