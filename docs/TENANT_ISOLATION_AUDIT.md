# TMS Pro v1.0 — Tenant Isolation Audit

**Audit date:** July 2026  
**Scope:** All entities implementing `ITenantScoped`, controllers, services, background jobs, reporting  
**Result:** Pass with documented exceptions

---

## 1. Enforcement model

| Layer | Mechanism |
|-------|-----------|
| JWT | `company_id` claim on staff and portal tokens |
| Middleware | `TenantScopeMiddleware` resolves `ITenantContext` per request |
| Query filter | `tenants.Filter(IQueryable<ITenantScoped>)` |
| FK lookups | `TenantScope.Find*Async` helpers |
| Branch scope | `IBranchScoped` + `branches.Filter()` for operational entities |
| Platform admin | Optional `X-Company-Id` header to impersonate tenant |
| Portal | `company_id` claim + explicit `CompanyId ==` checks |

---

## 2. ITenantScoped entities — enforcement matrix

### Core business (`IBranchScoped` + tenant)

| Entity | Filter on read | CompanyId on write | FK lookups scoped |
|--------|----------------|-------------------|-------------------|
| Booking | Yes | Yes | Yes |
| Customer | Yes | Yes | Yes |
| Driver | Yes | Yes | Yes |
| Vehicle | Yes | Yes | Yes |
| Expense | Yes | Yes | Yes |
| LorryReceipt | Yes | Yes | Yes |
| Trip | Yes | Yes | Yes |

**Controllers:** `BookingsController`, `VehiclesController`, `MasterDataControllers`, `ModuleControllers2` (trips)

### Finance & accounting

| Entity | Filter on read | CompanyId on write | Notes |
|--------|----------------|-------------------|-------|
| Vendor | Yes | Yes | |
| Broker | Yes | Yes | Sync scoped by companyId |
| BookingPayment | Yes | Yes | |
| BookingExpense | Yes | Yes | |
| BookingBrokerCharge | Yes | Yes | |
| Provision | Yes | Yes | |
| TransportBill | Yes | Yes | |
| LedgerAccount | Yes | Yes | |
| Voucher | Yes | Yes | |
| VoucherLine | Yes | Yes | |
| AccountingReportJob | Yes | Yes | Background worker uses `FixedTenantContext` |

**Controllers:** `AccountingController`, `BookingFinanceController`  
**Services:** `AccountingReportService`, `AccountingRegisterJobService`, `AccountingBalanceService`, `BookingFinanceService`

### Enterprise modules

| Entity | Filter on read | CompanyId on write |
|--------|----------------|-------------------|
| Invoice | Yes | Yes |
| Document | Yes | Yes |
| ProofOfDelivery | Yes | Yes |
| MarketplaceListing | Yes | Yes |
| FreightBid | Yes | Yes |
| Warehouse | Yes | Yes |
| WarehouseInventory | Yes | Yes |
| IotDevice | Yes | Yes |
| IotSensorReading | Yes | Yes |
| AiChatSession | Yes | Yes |
| AiMessage | Yes | Yes |
| ForecastSnapshot | Yes | Yes |
| RouteOptimizationJob | Yes | Yes |
| Notification | Yes | Yes |
| NotificationTemplate | Yes | Yes |
| NotificationOutbox | Yes | Yes |
| NotificationPreference | Yes | Yes |
| NotificationChannelSettings | Yes | Yes |
| SparePart | Yes | Yes |
| CompanySettings | Yes | Yes |
| Branch | Yes | Yes |
| Geofence | Yes | Yes |

**Controllers:** `ModuleControllers`, `ModuleControllers2`, `NotificationChannelsController`, `MaintenanceController`, `GpsControllers`, `RouteOptimizationController`

### Notifications & background

| Component | Tenant enforcement |
|-----------|-------------------|
| `NotificationDispatcher` | Sets `CompanyId` from request or tenant context |
| `NotificationOutboxWorker` | Processes outbox rows (company_id on row) |
| `AccountingReportWorker` | Jobs filtered by `job.CompanyId`; builds registers with `FixedTenantContext` |

### Portal

| Endpoint | Enforcement |
|----------|-------------|
| `/api/portal/invoices` | `CompanyId ==` portal claim |
| `/api/portal/invoices/{id}` | Id + CompanyId + customer/booking scope |
| `/api/portal/pod/{bookingId}` | Booking CompanyId + POD CompanyId |
| `/api/portal/shipments` | `CustomerTrackingService.ScopeBookings` |
| `/api/portal/auth/*` | Rate limited; demo logins scoped to default company |

---

## 3. Vehicle-scoped entities (join-based isolation)

These tables have `company_id` in PostgreSQL but EF models use **vehicle join** scoping via `TenantScope`:

| Entity | Scoping method |
|--------|----------------|
| GpsTrack | `TenantScope.GpsTracks(db, tenants)` |
| GeofenceEvent | `TenantScope.GeofenceEvents(db, tenants)` |
| GeofenceAssignment | Validated via geofence + `ValidateVehicleIdsAsync` |
| VehicleLastPosition | Via vehicle ownership in `CustomerTrackingService` |
| MaintenanceRecord | Via vehicle join in `MaintenanceService` |
| FuelEntry | Via vehicle join |

**Status:** Functionally isolated. `company_id` backfilled in DB; NOT NULL enforced by migration script.

---

## 4. Intentional exceptions

| Case | Reason |
|------|--------|
| `users.company_id` NULL for Platform Super Admin | Platform operators are not tenant-bound |
| Platform admin without `X-Company-Id` | Returns empty scoped queries or 403 on tenant-only endpoints |
| `EntityMappers.NextBrokerId` / `NextCustomerId` | ID generation uses global count — **no data leak**, potential ID collision across tenants (low risk) |
| Super Admin cross-tenant header | By design for platform support |

---

## 5. Automated test coverage

| Test area | Tests |
|-----------|-------|
| Finance invoices | `Finance_invoices_only_return_own_company_rows` |
| Marketplace | List + cross-tenant bid rejection |
| IoT devices | Tenant scoped list |
| Documents | Expiring docs scoped |
| AI forecasts | Tenant scoped |
| Booking FK | Cross-tenant vehicle not linked |
| Geofence | List, get, assignment rejection |
| Portal invoices | List + detail isolation |
| Accounting jobs | Cross-tenant job status hidden |
| Warehouses | Tenant scoped list |
| Vendors | `Tenant_user_sees_only_own_company_vendors` |
| TenantScope unit | Vehicle lookup, validate IDs, broker sync |

**Total backend tests:** 59 passing

---

## 6. Audit conclusion

All Priority 1 and Priority 2 tenant isolation paths are enforced. Remaining items are **technical debt** (ID generators, optional CompanyId on vehicle-child inserts) — not deployment blockers.

**Auditor recommendation:** Approved for production rollout after running `tenant_company_id_not_null.sql`.
