# TMS Pro v1.0 — Production Deployment Package

This document is the operational runbook for deploying TMS Pro as a multi-tenant SaaS application.

---

## 1. Database migration order

Run scripts **in this order** against the production PostgreSQL database. Take a full backup before step 1.

| Step | Script / action | Purpose |
|------|-----------------|---------|
| 0 | Full `pg_dump` backup | Recovery point |
| 1 | `database/core/stored_procedures.sql` | Core PL/pgSQL functions |
| 2 | `database/perf/add_perf_indexes.sql` | Performance indexes |
| 3 | Module schemas (if not already applied via API bootstrap) | See SchemaBootstrap order below |
| 4 | `database/saas/schema.sql` | Companies, subscriptions, core `company_id` columns + backfill |
| 5 | `database/saas/tenant_modules.sql` | Module `company_id` columns + backfill + `accounting_report_jobs` |
| 6 | `database/saas/tenant_hr_payroll_columns.sql` | HR/payroll tenant columns (if HR module installed) |
| 7 | `database/saas/tenant_hr_payroll_procs.sql` | Tenant-scoped HR/payroll stored procedures |
| 8 | **Pre-flight validation** (see §2) | Confirm zero NULL `company_id` rows |
| 9 | `database/saas/tenant_company_id_not_null.sql` | Enforce NOT NULL on `company_id` |

### API startup migration order (automatic when `Database:RunStartupMigrations=true`)

Defined in `SchemaBootstrap.RunAsync`:

1. Core  
2. HrPayroll  
3. Maintenance  
4. EnterpriseModule  
5. GPS  
6. Notification  
7. Branch  
8. Portal  
9. Routing  
10. BookingFinance  
11. SaaS (`schema.sql`, `tenant_modules.sql`, `tenant_hr_payroll_columns.sql`)

**Note:** Step 9 (`tenant_company_id_not_null.sql`) is **manual only** — run after validating backfill on production data.

---

## 2. Pre-flight validation (before NOT NULL migration)

```sql
-- Must return zero rows before running tenant_company_id_not_null.sql
SELECT 'bookings' AS tbl, COUNT(*) AS null_count FROM bookings WHERE company_id IS NULL
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE company_id IS NULL
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles WHERE company_id IS NULL
UNION ALL SELECT 'customers', COUNT(*) FROM customers WHERE company_id IS NULL
UNION ALL SELECT 'vouchers', COUNT(*) FROM vouchers WHERE company_id IS NULL
UNION ALL SELECT 'geofences', COUNT(*) FROM geofences WHERE company_id IS NULL
UNION ALL SELECT 'hr_employees', COUNT(*) FROM hr_employees WHERE company_id IS NULL
ORDER BY null_count DESC;
```

If any row shows `null_count > 0`, re-run the appropriate backfill section in `tenant_modules.sql` or `schema.sql` before proceeding.

---

## 3. Rollback procedure

### Application rollback

1. Stop the API service: `systemctl stop tms-api`
2. Deploy the previous known-good build artifact
3. Restart: `systemctl start tms-api`
4. Verify `/api/health` returns `healthy`

### Database rollback (NOT NULL constraints only)

If step 9 was applied but must be reversed:

```bash
psql -U postgres -d tms_pro -f database/saas/tenant_company_id_not_null_rollback.sql
```

This drops NOT NULL constraints only. It does **not** remove columns or backfilled data.

### Full database rollback

Restore from the pre-migration `pg_dump` backup:

```bash
pg_restore -U postgres -d tms_pro --clean --if-exists backup_pre_v1.dump
```

---

## 4. Environment variable checklist

### Backend (`appsettings.Production.json` overrides or environment variables)

| Variable / key | Required | Description |
|----------------|----------|-------------|
| `ConnectionStrings__DefaultConnection` | Yes | PostgreSQL connection string |
| `Jwt__Key` | Yes | JWT signing key (≥32 characters). **Never use default in production** |
| `Jwt__Issuer` | Yes | Token issuer (e.g. `TmsApi`) |
| `Jwt__Audience` | Yes | Token audience (e.g. `TmsClient`) |
| `Jwt__ExpireHours` | No | Staff token lifetime (default 12) |
| `Cors__Origins__0` | Yes | Production frontend origin(s) |
| `Database__RunStartupMigrations` | Yes | Set `true` for first deploy; `false` after manual migration |
| `Database__FailOnMigrationError` | Recommended | Set `true` in production after initial setup |
| `DemoData__Enabled` | Yes | Must be `false` in production |
| `Gps__AllowSimulator` | Yes | Must be `false` in production |
| `Notifications__Enabled` | No | Enable SMS/WhatsApp dispatch |
| `Notifications__Msg91__AuthKey` | If SMS | MSG91 API key |
| `Auth__RateLimitPermitLimit` | No | Login attempts per IP per window (default 10) |
| `Auth__RateLimitWindowMinutes` | No | Rate limit window (default 1) |
| `Accounting__ReportJobIntervalSeconds` | No | Background register refresh interval |
| `ASPNETCORE_ENVIRONMENT` | Yes | `Production` |
| `ASPNETCORE_URLS` | Yes | e.g. `http://127.0.0.1:5000` |

### Frontend (build-time)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | API base URL (e.g. `/api` behind nginx or full URL) |
| `VITE_BASE_PATH` | No | Subpath hosting prefix |

---

## 5. Deployment checklist

### Pre-deploy

- [ ] Full database backup completed and verified restorable
- [ ] Production JWT key generated and stored in secrets manager
- [ ] `DemoData:Enabled` confirmed `false`
- [ ] `Gps:AllowSimulator` confirmed `false`
- [ ] CORS origins set to production domain only
- [ ] SSL/TLS certificate valid on reverse proxy
- [ ] All migration scripts reviewed and tested on staging

### Deploy

- [ ] Run database migrations in order (§1)
- [ ] Pre-flight NULL check passed (§2)
- [ ] Run `tenant_company_id_not_null.sql`
- [ ] Publish API: `dotnet publish backend/Tms.Api -c Release -o /opt/tms/api`
- [ ] Build frontend: `npm ci && npm run build`
- [ ] Copy `dist/` to web root; configure nginx (`deploy/nginx-tms.conf`)
- [ ] Install/update systemd unit (`deploy/tms-api.service`)
- [ ] Start services and confirm health endpoint

### Post-deploy validation

See `deploy/POST_DEPLOYMENT_VALIDATION.md`.

---

## 6. Related files

| File | Purpose |
|------|---------|
| `deploy/nginx-tms.conf` | Reverse proxy configuration |
| `deploy/tms-api.service` | systemd unit for API |
| `deploy/postgresql-8gb.conf.snippet` | PostgreSQL tuning reference |
| `deploy/POST_DEPLOYMENT_VALIDATION.md` | Post-deploy smoke tests |
| `docs/TMS_V1_TECHNICAL_DOCUMENTATION.md` | Architecture reference |
| `docs/TENANT_ISOLATION_AUDIT.md` | Tenant isolation audit |
| `docs/PRODUCTION_READINESS_REPORT.md` | v1.0 readiness assessment |
