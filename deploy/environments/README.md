# Multi-environment deployment (Production + Demo)

Native deployment (no Docker). See:

- `deploy/PRODUCTION_DEPLOYMENT.md` — database migration order and runbook
- `deploy/deploy-on-server.sh` — pull, publish API, build web, restart systemd
- `deploy/tms-api.service` — systemd unit for the .NET API
- `deploy/nginx-tms.conf` — Nginx reverse proxy example

Scripts:
- `deploy/environments/scripts/setup-server.sh`
- `deploy/environments/scripts/install-nginx.sh`
- `deploy/environments/scripts/install-ssl.sh`
