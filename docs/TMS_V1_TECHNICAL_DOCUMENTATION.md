# TMS Pro v1.0 — Technical Documentation

**Version:** 1.0  
**Stack:** React (Vite) · ASP.NET Core 8 · PostgreSQL  
**Architecture:** Multi-tenant SaaS, shared schema, row-level isolation

---

## 1. Module overview

| Module | Frontend routes | API prefix | Description |
|--------|----------------|------------|-------------|
| **Core TMS** | `/bookings`, `/vehicles`, `/drivers`, `/customers`, `/vendors`, `/expenses`, `/lr` | `/api/bookings`, `/api/vehicles`, … | Booking, fleet, LR, expenses |
| **Accounting** | `/accounting/*` | `/api/accounting` | Ledger, vouchers, registers, P&L, GST |
| **Dashboard & reports** | `/`, `/reports/*` | `/api/dashboard`, `/api/accounting` | KPIs, charts, exports |
| **Booking finance** | `/accounting/provisions`, payment adjustment | `/api/booking-finance` | Broker charges, provisions, outstanding sync |
| **GPS & geofencing** | `/gps/*` | `/api/gps`, `/api/geofences` | Live fleet, history, geofence alerts |
| **Maintenance** | `/maintenance/*` | `/api/maintenance` | Work orders, spare parts, schedules |
| **HR & payroll** | `/hr/*`, `/payroll/*` | `/api/hr`, `/api/payroll` | Employees, leave, payroll runs |
| **Enterprise** | `/operations/*` | `/api/trips`, `/api/documents`, `/api/marketplace`, `/api/iot`, `/api/ai`, `/api/warehouses` | Trips, documents, marketplace, IoT, AI forecasts |
| **Customer portal** | `/portal/*` | `/api/portal`, `/api/portal/auth` | Shipments, tracking, invoices, POD |
| **Platform admin** | `/platform/*` | `/api/platform` | Companies, subscriptions, plans |
| **Settings** | `/settings/*` | `/api/settings`, `/api/branches` | Company settings, branches, notifications |

---

## 2. Database schema

### Platform tables

- `companies` — tenant registry  
- `subscription_plans`, `company_subscriptions`, `company_usage`  
- `users` — staff (optional `company_id`; NULL for platform admin)  
- `branches` — sub-units within company  

### Core business tables

All include `company_id UUID NOT NULL → companies(id)` after v1.0 migration:

`customers`, `vendors`, `drivers`, `vehicles`, `bookings`, `lorry_receipts`, `expenses`, `brokers`, `booking_payments`, `booking_expenses`, `booking_broker_charges`, `transport_bills`, `provisions`, `ledger_accounts`, `vouchers`, `voucher_lines`, `company_settings`, `trips`

### Module tables

GPS, maintenance, notifications, invoices, marketplace, IoT, AI, warehouses, HR, payroll — see `database/saas/tenant_modules.sql`.

### Schema scripts

| Path | Purpose |
|------|---------|
| `database/saas/schema.sql` | Core SaaS + company_id on business tables |
| `database/saas/tenant_modules.sql` | Module company_id + backfill |
| `database/saas/tenant_company_id_not_null.sql` | Production NOT NULL enforcement |
| `database/core/stored_procedures.sql` | Core PL/pgSQL |
| `database/saas/tenant_hr_payroll_procs.sql` | Tenant-scoped HR/payroll procedures |
| `database/perf/add_perf_indexes.sql` | Query performance indexes |

---

## 3. Tenant isolation architecture

```
Request → JWT (company_id) → TenantScopeMiddleware → ITenantContext
                              ↓
                    tenants.Filter(IQueryable<ITenantScoped>)
                              ↓
                    TenantScope.Find*Async (FK validation)
                              ↓
                    PostgreSQL (company_id column)
```

- **Staff users:** `company_id` from JWT; all queries filtered automatically.  
- **Platform admin:** No filter unless `X-Company-Id` header provided.  
- **Portal users:** `company_id` + optional `customer_id` / `booking_id` scope.  
- **Background jobs:** Explicit `company_id` on job row; `FixedTenantContext(job.CompanyId)` when building reports.

See `docs/TENANT_ISOLATION_AUDIT.md` for full entity matrix.

---

## 4. Authentication & authorization

### Staff authentication

1. `POST /api/auth/login` → JWT with claims: `name`, `role`, `company_id`, `branch_id`, `features`  
2. Rate limited: 10 requests/min/IP (configurable)  
3. Default policy: `StaffOnly` (excludes Customer role)

### Portal authentication

1. `POST /api/portal/auth/login` — phone + PIN (customer scope)  
2. `POST /api/portal/auth/track` — booking ID + phone (booking scope)  
3. Policy: `PortalUser` (any authenticated user including Customer)

### Roles

| Role | Scope |
|------|-------|
| Platform Super Admin / Super Admin | All companies (with header) |
| Company Admin / Admin | Full company |
| Accountant | Accounting + reports |
| Operator | Operations |
| Customer | Portal only |

---

## 5. Background jobs

| Worker | Interval | Tenant handling |
|--------|----------|-----------------|
| `AccountingReportWorker` | 45s (configurable) | Processes `accounting_report_jobs` by `CompanyId`; caches per company |
| `NotificationOutboxWorker` | 30s | Dispatches rows with `company_id` |

Disabled in `Testing` environment.

---

## 6. Caching strategy

| Cache | Key pattern | TTL | Service |
|-------|-------------|-----|---------|
| Dashboard charts | `dashboard:chart:{companyId}:{chart}` | 5 min | `DashboardCacheService` |
| Accounting registers | `accounting:register:{type}:{companyId}` | 5 min | `AccountingRegisterJobService` |

In-memory (`IMemoryCache`). For multi-instance deployment, migrate to Redis with same key patterns.

---

## 7. Stored procedures

Tenant-scoped HR/payroll procedures in `database/saas/tenant_hr_payroll_procs.sql`:

- `sp_hr_summary(p_company_id)`  
- `sp_hr_list_departments(p_company_id)`  
- `sp_hr_upsert_department(p_company_id, …)`  
- `sp_hr_list_employees(p_company_id, …)`  
- `sp_payroll_summary(p_company_id)`  
- `sp_payroll_list_runs(p_company_id, …)`  

All accept `p_company_id UUID` as first parameter — never call without tenant context.

Core procedures in `database/core/stored_procedures.sql` for legacy booking/LR operations.

---

## 8. API structure

Base URL: `/api`

| Controller | Route | Auth |
|------------|-------|------|
| `AuthController` | `/auth` | Anonymous (login) |
| `BookingsController` | `/bookings` | Staff |
| `VehiclesController` | `/vehicles` | Staff |
| `MasterDataControllers` | `/drivers`, `/customers`, `/vendors`, `/expenses`, `/lr` | Staff |
| `AccountingController` | `/accounting` | Staff |
| `BookingFinanceController` | `/booking-finance` | Staff |
| `DashboardController` | `/dashboard` | Staff |
| `GpsController` | `/gps` | Staff |
| `GeofenceController` | `/geofences` | Staff |
| `MaintenanceController` | `/maintenance` | Staff |
| `ModuleControllers` | `/pod` | Staff |
| `ModuleControllers2` | `/finance`, `/documents`, `/marketplace`, `/iot`, `/ai`, `/trips`, `/shipments`, `/warehouses` | Staff |
| `PortalAuthController` | `/portal/auth` | Mixed |
| `PortalController` | `/portal` | Portal |
| `PlatformController` | `/platform` | Platform admin |
| `HrController` | `/hr` | Staff |
| `PayrollController` | `/payroll` | Staff |
| `BranchesController` | `/branches` | Staff |
| `SettingsController` | `/settings` | Staff |
| `RouteOptimizationController` | `/routing` | Staff |
| `NotificationChannelsController` | `/notifications` | Staff |

Health: `GET /api/health`

---

## 9. Deployment guide

See **`deploy/PRODUCTION_DEPLOYMENT.md`** for:

- Migration order  
- Rollback procedure  
- Environment variables  
- Deployment checklist  
- Post-deployment validation (`deploy/POST_DEPLOYMENT_VALIDATION.md`)

Quick start:

```bash
# Database
psql -d tms_pro -f database/saas/schema.sql
psql -d tms_pro -f database/saas/tenant_modules.sql
# Validate NULL counts, then:
psql -d tms_pro -f database/saas/tenant_company_id_not_null.sql

# API
dotnet publish backend/Tms.Api -c Release -o /opt/tms/api
systemctl start tms-api

# Frontend
npm ci && npm run build
# Serve dist/ via nginx (deploy/nginx-tms.conf)
```

---

## 10. Backup & recovery

### Recommended schedule

| Asset | Frequency | Retention |
|-------|-----------|-----------|
| PostgreSQL full dump | Daily | 30 days |
| WAL archiving | Continuous (production) | 7 days |
| Application config / secrets | On change | Version controlled (excluding secrets) |
| Uploaded documents / POD images | Daily | 90 days |

### Backup command

```bash
pg_dump -U postgres -Fc -f tms_pro_$(date +%Y%m%d).dump tms_pro
```

### Recovery

1. Stop API  
2. `pg_restore -U postgres -d tms_pro --clean --if-exists tms_pro_YYYYMMDD.dump`  
3. Verify migration version / NOT NULL constraints  
4. Restart API and run post-deployment validation  

### RPO / RTO targets (recommended)

- **RPO:** 24 hours (daily backup) or 1 hour with WAL archiving  
- **RTO:** 2–4 hours including restore and validation  

---

## Related documentation

- `docs/TMS_SaaS_Product_Architecture.md` — product-level architecture  
- `docs/TENANT_ISOLATION_AUDIT.md` — security audit  
- `docs/PRODUCTION_READINESS_REPORT.md` — v1.0 readiness assessment  
- `docs/WORKFLOWS.md` — business workflows  
