# Deploy TMS Pro on Contabo VPS with Coolify 4.x

## Architecture

```
Browser → Coolify proxy / port 80 → tms-web (nginx + React)
                                      └─ /api/* → tms-api (.NET 8)
                                                    └─ PostgreSQL (Coolify DB)
```

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
