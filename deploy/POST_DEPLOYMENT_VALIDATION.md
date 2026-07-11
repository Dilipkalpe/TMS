# Post-Deployment Validation Checklist

Run these checks immediately after every production deployment.

---

## Infrastructure

- [ ] `GET /api/health` returns `{ "status": "healthy" }`
- [ ] API logs show no migration errors on startup
- [ ] PostgreSQL connections stable (check `pg_stat_activity`)
- [ ] nginx serves frontend and proxies `/api` correctly
- [ ] HTTPS redirect working; no mixed-content warnings

---

## Authentication & security

- [ ] Staff login works with production credentials
- [ ] Invalid login returns 401 (not 500)
- [ ] Rate limiting returns 429 after repeated failed logins (verify in staging only)
- [ ] Portal login works for a test customer
- [ ] Portal track-login returns uniform 404 for invalid booking/phone
- [ ] JWT contains `company_id` claim for tenant users
- [ ] Platform admin can switch tenant via `X-Company-Id` header

---

## Tenant isolation (critical)

- [ ] Tenant user A cannot see tenant B vendors, bookings, or invoices
- [ ] Cross-tenant vehicle ID is not linked on booking create
- [ ] Marketplace bid on another tenant's listing returns 404
- [ ] Geofence assignment with foreign vehicle returns 400
- [ ] Portal invoices scoped to portal user's company
- [ ] Accounting register job status for other company returns 404

Automated coverage: `dotnet test backend/Tms.Api.Tests` (59 integration/unit tests).

---

## Core business flows

- [ ] Create booking → appears in list
- [ ] Generate LR for booking
- [ ] Record expense with vendor lookup
- [ ] Dashboard loads without errors
- [ ] Accounting voucher entry saves
- [ ] Outstanding report shows correct tenant data

---

## Background jobs

- [ ] Accounting report worker processing (check logs every ~45s)
- [ ] Notification outbox worker running (if enabled)
- [ ] Dashboard chart cache populating (second request faster)

---

## Database integrity

```sql
-- Must all return 0
SELECT COUNT(*) FROM bookings WHERE company_id IS NULL;
SELECT COUNT(*) FROM invoices WHERE company_id IS NULL;
SELECT COUNT(*) FROM vehicles WHERE company_id IS NULL;
```

- [ ] NOT NULL constraints present on core tables:

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'company_id';
-- Expected: is_nullable = NO
```

---

## Performance smoke

- [ ] Dashboard initial load < 3s (typical tenant dataset)
- [ ] Booking list paginated response < 1s
- [ ] No N+1 query warnings in logs at Warning level

---

## Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Deploy engineer | | | |
| QA / product owner | | | |
