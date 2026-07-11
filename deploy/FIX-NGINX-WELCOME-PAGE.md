# Fix: "Welcome to nginx!" instead of TMS

## Diagnosis

| Check | Your server |
|-------|-------------|
| `http://tms.144.91.98.218.nip.io` | Default nginx page (wrong) |
| `http://144.91.98.218:8080` | Connection refused — **TMS not running** |
| `http://144.91.98.218:8000` | Coolify OK |

**Root cause:** TMS Docker stack is not deployed/running, and host nginx has no vhost for the TMS subdomain.

---

## Fix (in order)

### Step 1 — Deploy TMS in Coolify

1. Coolify → **+ New Resource** → **Docker Compose**
2. GitHub: `Dilipkalpe/TMS`, branch `main`
3. Compose file: `deploy/docker-compose.coolify.yml`
4. Environment variables:

```
TMS_CONNECTION_STRING=Host=YOUR_PG_HOST;Port=5432;Database=tms_pro;Username=tms;Password=...
TMS_JWT_KEY=your-48-char-secret
Database__RunStartupMigrations=true
DemoData__Enabled=false
Gps__AllowSimulator=false
Cors__Origins__0=http://tms.144.91.98.218.nip.io
TMS_WEB_PORT=8080
```

5. **Deploy** and wait until build finishes (5–15 min)
6. Verify on server: `curl http://127.0.0.1:8080/api/health` must return JSON

### Step 2 — Configure host nginx for TMS subdomain

SSH as root:

```bash
cd /var/www/tms   # or clone: git clone https://github.com/Dilipkalpe/TMS.git /var/www/tms
cp deploy/nginx-tms-nipio.conf /etc/nginx/sites-available/tms-nipio
ln -sf /etc/nginx/sites-available/tms-nipio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 3 — Verify

- http://tms.144.91.98.218.nip.io → TMS login page
- http://tms.144.91.98.218.nip.io/api/health → `healthy`

Login: `admin` / `admin123`

---

## Keep other apps working

Do **not** remove nginx entirely if RMS Enterprise uses it. Only:

1. Remove `default` site (`sites-enabled/default`)
2. Add `tms-nipio` config for TMS subdomain
3. Keep your existing RMS nginx config unchanged
