# Deploy TMS Pro on Contabo VPS with Coolify 4.x

## Architecture

```
Browser → Coolify proxy (shared with other apps) → tms-web (nginx + React)
                                                    └─ /api/* → tms-api (.NET 8)
                                                                  └─ PostgreSQL (dedicated tms_pro DB)
```

## Multiple apps on one server

When other applications already use port 80, **do not** compete for `144.91.98.218:80`.
Use one of these patterns:

| Pattern | When to use | TMS URL example |
|---------|-------------|-----------------|
| **Subdomain (recommended)** | You have a domain | `https://tms.yourdomain.com` |
| **Dedicated port** | No domain yet | `http://144.91.98.218:8080` |
| **Coolify FQDN** | Coolify assigns routing | Set in service **Domains** tab |

Steps for subdomain (best for production):

1. DNS: `tms` A-record → `144.91.98.218`
2. Coolify → **tms-web** service → **Domains** → `tms.yourdomain.com` → Enable HTTPS
3. Env: `Cors__Origins__0=https://tms.yourdomain.com`
4. Leave `TMS_WEB_PORT` **empty** (Coolify proxy handles port 80/443)

Steps for dedicated port (quick test):

1. Env: `TMS_WEB_PORT=8080`
2. Env: `Cors__Origins__0=http://144.91.98.218:8080`
3. Open `http://144.91.98.218:8080`

**Stop host nginx** if it shows "Welcome to nginx!" on port 80 and blocks Coolify:

```bash
systemctl stop nginx
systemctl disable nginx
```

Each app should have its **own PostgreSQL database** (`tms_pro` for TMS only).

## 1. Create PostgreSQL in Coolify

1. Open Coolify: `http://144.91.98.218:8000`
2. **+ New Resource** → **Database** → **PostgreSQL** (15 or 16)
3. Name: `tms-postgres`
4. Database name: `tms_pro`
5. Save credentials — you need the **internal connection URL** for the API container

Example connection string for the API:

```
Host=<coolify-postgres-container-name>;Port=5432;Database=tms_pro;Username=...;Password=...
```

## 2. Deploy TMS stack (Docker Compose)

1. **+ New Resource** → **Docker Compose**
2. Source: Git repository `https://github.com/Dilipkalpe/TMS.git` (branch `main`)
   - Or upload/clone to server at `/var/www/tms`
3. Compose file path: `deploy/docker-compose.coolify.yml`
4. Base directory: repository root
5. Environment variables (from `deploy/.env.production.example`):

| Variable | Value |
|----------|--------|
| `TMS_CONNECTION_STRING` | Coolify Postgres internal URL |
| `TMS_JWT_KEY` | Random 32+ char secret |
| `Database__RunStartupMigrations` | `true` (first deploy only) |
| `DemoData__Enabled` | `false` |
| `Gps__AllowSimulator` | `false` |
| `Cors__Origins__0` | `http://144.91.98.218` or your domain |

6. **Deploy**

## 3. Post-deploy

1. Wait for API health: `curl http://144.91.98.218/api/health`
2. Open `http://144.91.98.218` — login page should load
3. Default admin (if seeded): `admin` / `admin123` — **change immediately**
4. After first successful start, set `Database__RunStartupMigrations=false`

## 4. Optional: custom domain + HTTPS

In Coolify → **tms-web** service → **Domains** → add domain → enable Let's Encrypt.

Update `Cors__Origins__0` to `https://yourdomain.com`.

## 5. Manual deploy on VPS (without Coolify UI)

```bash
cd /var/www/tms
git pull
cp deploy/.env.production.example .env
# edit .env with real secrets
docker compose -f deploy/docker-compose.coolify.yml up -d --build
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API cannot connect to DB | Use Postgres **internal** hostname from Coolify, not `localhost` |
| GPS/Notification migration warnings | Run SQL fixes from deploy docs or redeploy latest API |
| CORS errors | Set `Cors__Origins__0` to exact browser URL |
| Slow startup | Set `Database__RunStartupMigrations=false` after first deploy |
