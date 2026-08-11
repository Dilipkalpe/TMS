#!/usr/bin/env bash
set -euo pipefail
# shellcheck disable=SC1091
source /etc/tms/db.credentials
systemctl stop tms-api || true

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
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW public.%I OWNER TO ${PG_APP_USER}', r.relname);
  END LOOP;

  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'm'
  LOOP
    EXECUTE format('ALTER MATERIALIZED VIEW public.%I OWNER TO ${PG_APP_USER}', r.relname);
  END LOOP;

  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO ${PG_APP_USER}', r.proname, r.args);
  END LOOP;

  FOR r IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO ${PG_APP_USER}', r.typname);
  END LOOP;
END
\$\$;

GRANT ALL ON SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${PG_APP_USER};
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO ${PG_APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${PG_APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${PG_APP_USER};
SQL

echo -n "branches owner: "
sudo -u postgres psql -d "$PG_DB" -tAc "SELECT tableowner FROM pg_tables WHERE tablename='branches';"

systemctl reset-failed tms-api || true
systemctl restart tms-api
sleep 15
systemctl --no-pager --full status tms-api | head -25
curl -fsS http://127.0.0.1:5000/api/health || { journalctl -u tms-api -n 80 --no-pager; exit 1; }
echo ""
curl -fsS -o /dev/null -w "login HTTP %{http_code}\n" http://127.0.0.1/login
curl -fsS -o /dev/null -w "health via nginx %{http_code}\n" http://127.0.0.1/api/health || true
if ss -tlnp | grep -q ':8080 '; then echo "WARN: :8080 still listening"; else echo "OK: :8080 disabled"; fi
ss -tlnp | grep -E ':80 |:5000 |:5432 ' || true
echo "DONE"
