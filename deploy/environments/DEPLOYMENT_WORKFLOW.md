# IMS / TMS / RMS — Production & Demo Deployment Workflow

This package defines **six fully isolated environments** on one VPS (or multiple servers):

| Environment | Apps | Base path |
|-------------|------|-----------|
| **Production** | IMS, TMS, RMS | `/var/www/prod/{app}` |
| **Demo (UAT)** | IMS, TMS, RMS | `/var/www/demo/{app}` |

Demo deployments **never** touch Production databases, uploads, logs, or containers.

---

## 1. Architecture overview

```
                    ┌─────────────────────────────────────────┐
                    │           Host Nginx + SSL              │
                    │  tms.company.com  → :8101 (prod web)    │
                    │  api-tms...       → :5101 (prod api)    │
                    │  demo-tms...      → :8201 (demo web)    │
                    │  demo-api-tms...  → :5201 (demo api)    │
                    └─────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
  prod-tms (compose)              prod-ims (compose)              prod-rms (compose)
  ├ postgres → TMS_PROD_DB        ├ postgres → IMS_PROD_DB        ├ postgres → RMS_PROD_DB
  ├ tms-api                        ├ ims-api                        ├ rms-api
  └ tms-web                        └ ims-web                        └ rms-web

  demo-tms (compose)              demo-ims (compose)              demo-rms (compose)
  ├ postgres → TMS_DEMO_DB        ├ postgres → IMS_DEMO_DB        ├ postgres → RMS_DEMO_DB
  ├ tms-api                        ├ ims-api                        ├ rms-api
  └ tms-web                        └ ims-web                        └ rms-web
```

Each stack has its own:

- Docker Compose project (`prod-tms`, `demo-tms`, …)
- PostgreSQL volume (`prod-tms_pg_data`, …)
- `.env` file
- `uploads/`, `logs/`, `backups/` folders
- Nginx vhosts + SSL certificates
- Backup cron jobs

---

## 2. Directory structure

```
/var/www/
├── prod/
│   ├── ims/   (.env, uploads/, logs/, backups/, git clone)
│   ├── tms/
│   └── rms/
└── demo/
    ├── ims/
    ├── tms/
    └── rms/
```

---

## 3. Domains & ports

Replace `company.com` with your real domain.

| App | Environment | Frontend | API | Web port | API port | Database |
|-----|-------------|----------|-----|----------|----------|----------|
| TMS | Production | tms.company.com | api-tms.company.com | 8101 | 5101 | TMS_PROD_DB |
| TMS | Demo | demo-tms.company.com | demo-api-tms.company.com | 8201 | 5201 | TMS_DEMO_DB |
| IMS | Production | ims.company.com | api-ims.company.com | 8102 | 5102 | IMS_PROD_DB |
| IMS | Demo | demo-ims.company.com | demo-api-ims.company.com | 8202 | 5202 | IMS_DEMO_DB |
| RMS | Production | rms.company.com | api-rms.company.com | 8103 | 5103 | RMS_PROD_DB |
| RMS | Demo | demo-rms.company.com | demo-api-rms.company.com | 8203 | 5203 | RMS_DEMO_DB |

---

## 4. Initial server setup (one time)

### 4.1 DNS

Create **A records** for all 12 hostnames pointing to your VPS IP.

### 4.2 Create folders

```bash
cd /var/www/tms   # or clone TMS repo first
sudo bash deploy/environments/scripts/setup-server.sh
```

### 4.3 Clone repositories

```bash
# Production
git clone https://github.com/YOUR_ORG/TMS.git /var/www/prod/tms
git clone https://github.com/YOUR_ORG/IMS.git /var/www/prod/ims
git clone https://github.com/YOUR_ORG/RMS.git /var/www/prod/rms

# Demo (can be same remote, different .env)
git clone https://github.com/YOUR_ORG/TMS.git /var/www/demo/tms
git clone https://github.com/YOUR_ORG/IMS.git /var/www/demo/ims
git clone https://github.com/YOUR_ORG/RMS.git /var/www/demo/rms
```

### 4.4 Configure environment files

```bash
cp deploy/environments/env/prod.tms.env.example /var/www/prod/tms/.env
cp deploy/environments/env/demo.tms.env.example /var/www/demo/tms/.env
# Repeat for ims, rms
nano /var/www/prod/tms/.env   # set passwords, JWT keys, domain URLs
```

**Rules:**

- Use **different** `POSTGRES_PASSWORD` and JWT keys for prod vs demo.
- Demo: `DemoData__Enabled=true` (TMS), `ASPNETCORE_ENVIRONMENT=Staging`.
- Production: `DemoData__Enabled=false`, strong secrets only.

### 4.5 Nginx + SSL

```bash
sudo bash deploy/environments/scripts/install-nginx.sh
sudo bash deploy/environments/scripts/install-ssl.sh admin@company.com
```

### 4.6 Backup cron

```bash
sudo bash deploy/environments/scripts/install-cron.sh
```

---

## 5. Deployment workflow (every release)

### Step 1 — Deploy to Demo first

```bash
bash deploy/environments/scripts/deploy.sh tms demo
# or specific tag/commit:
bash deploy/environments/scripts/deploy.sh tms demo v1.2.0
```

### Step 2 — Test on Demo

- Open `https://demo-tms.company.com`
- Run UAT: login, HR, bookings, reports, portal
- Check API: `curl https://demo-api-tms.company.com/api/health`

### Step 3 — Promote to Production

```bash
bash deploy/environments/scripts/promote.sh tms
# or explicit commit:
bash deploy/environments/scripts/promote.sh tms abc1234
```

Production deploy uses **zero-downtime order**:

1. Build new API image  
2. Restart API only → wait for health check  
3. Restart Web container  

### Step 4 — Verify Production

```bash
curl -s https://api-tms.company.com/api/health
docker compose -p prod-tms ps
```

---

## 6. Manual commands

```bash
# Deploy
bash deploy/environments/scripts/deploy.sh <tms|ims|rms> <prod|demo> [git-ref]

# Backup
bash deploy/environments/scripts/backup.sh tms prod

# Logs
docker compose -p prod-tms -f /var/www/prod/tms/deploy/environments/compose/tms.stack.yml \
  --env-file /var/www/prod/tms/.env logs -f tms-api

# Restart one service
docker compose -p demo-tms -f ... --env-file /var/www/demo/tms/.env restart tms-api
```

---

## 7. Isolation checklist

| Resource | Isolated? | How |
|----------|-----------|-----|
| Database | Yes | Separate Postgres container + volume per stack |
| Uploads | Yes | `/var/www/{env}/{app}/uploads` bind mount |
| Logs | Yes | `/var/www/{env}/{app}/logs` bind mount |
| Backups | Yes | `/var/www/{env}/{app}/backups` |
| Secrets | Yes | Separate `.env` per path |
| Docker | Yes | Unique `-p` project name (`prod-tms` vs `demo-tms`) |
| Nginx | Yes | Separate vhost + SSL per domain |
| Cron | Yes | Separate backup jobs per env/app |

---

## 8. IMS / RMS setup notes

TMS includes a **ready** compose file: `deploy/environments/compose/tms.stack.yml`.

For IMS and RMS:

1. Copy `ims.stack.template.yml` → `ims.stack.yml` (in IMS repo)
2. Copy `rms.stack.template.yml` → `rms.stack.yml` (in RMS repo)
3. Adjust Dockerfiles and environment variable names
4. Copy env examples from `deploy/environments/env/`

---

## 9. Rollback

### Application

```bash
cd /var/www/prod/tms
git checkout <previous-tag>
bash deploy/environments/scripts/deploy.sh tms prod
```

### Database

```bash
gunzip -c /var/www/prod/tms/backups/TMS_PROD_DB_YYYYMMDD.sql.gz | \
  docker compose -p prod-tms -f deploy/environments/compose/tms.stack.yml \
  --env-file .env exec -T postgres psql -U tms_prod -d TMS_PROD_DB
```

---

## 10. File index

```
deploy/environments/
├── DEPLOYMENT_WORKFLOW.md          ← this document
├── compose/
│   ├── tms.stack.yml
│   ├── ims.stack.template.yml
│   └── rms.stack.template.yml
├── env/
│   ├── prod.tms.env.example
│   ├── demo.tms.env.example
│   └── … (ims, rms)
├── nginx/sites/
│   ├── prod-tms-web.conf
│   ├── prod-tms-api.conf
│   └── … (12 configs total)
└── scripts/
    ├── setup-server.sh
    ├── deploy.sh
    ├── promote.sh
    ├── backup.sh
    ├── install-nginx.sh
    ├── install-ssl.sh
    └── install-cron.sh
```

---

## 11. Migrating from current single TMS install

If TMS currently runs at `/var/www/tms` on port 8080:

1. Run `setup-server.sh`
2. Move or re-clone to `/var/www/prod/tms`
3. Copy existing `.env` → adjust `DB_NAME=TMS_PROD_DB`, ports `8101/5101`
4. Export old DB: `pg_dump … > migration.sql`
5. Deploy prod stack, import into new `TMS_PROD_DB`
6. Point nginx from nip.io to `tms.company.com`
7. Create `/var/www/demo/tms` for UAT

---

*Last updated: 2026-07-12*
