# TMS Pro SaaS — Product Architecture

**Version:** 2.0 (Multi-Tenant)  
**Date:** June 2026  

---

## 1. Architecture Overview

```
                    TMS SaaS (Single Application)
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   Super Admin          Company A             Company B
   (Platform)           (Tenant)              (Tenant)
         │                    │                    │
   • Create Company     • Admin               • Admin
   • Subscription       • Accountant          • Accountant
   • Billing            • Operator            • Operator
   • Plans              • Reports             • Reports
   • Support
```

**One database · Shared schema · Row-level isolation via `company_id` (Tenant ID)**

---

## 2. Tenant Hierarchy

| Level | Description |
|-------|-------------|
| **Platform** | SaaS operator manages all companies |
| **Company (Tenant)** | Transport business subscriber — all data scoped by `company_id` |
| **Branch** | Sub-unit within company (Enterprise / multi-branch plans) |
| **User** | Belongs to one company; optional branch scope |

---

## 3. Roles

### Platform (Super Admin)

| Role | Access |
|------|--------|
| Platform Super Admin / Super Admin | All companies, create tenants, plans, billing, support |

### Company Roles

| Role | Access |
|------|--------|
| **Admin** | Full company access, all branches, settings |
| **Accountant** | Accounting, reports, billing, outstanding |
| **Operator** | Booking, LR, fleet, day-to-day operations |

---

## 4. Data Isolation — `company_id` on Every Table

All business tables include **`company_id`** (UUID, FK → `companies`):

- users, branches, customers, vendors, drivers, vehicles  
- bookings, lorry_receipts, expenses  
- booking_payments, booking_expenses, booking_broker_charges, transport_bills  
- ledger_accounts, vouchers, provisions  
- trips, brokers, company_settings  

**JWT claim:** `company_id`  
**API filter:** `TenantContext` + `ITenantScoped`  
**Platform admin:** optional header `X-Company-Id` to impersonate a tenant  

---

## 5. Subscription Plans

### Starter — ₹999/month

| Item | Limit |
|------|-------|
| Users | 2 |
| Bookings | 500/month |
| Modules | Booking, LR, Billing, Outstanding |

### Professional — ₹2,499/month

| Item | Limit |
|------|-------|
| Users | Unlimited |
| Bookings | Unlimited |
| Modules | Starter + Accounting, Dashboard, P&L, Balance Sheet, GST Reports, Export |

### Enterprise — Custom pricing

| Item | Limit |
|------|-------|
| Users | Unlimited |
| Bookings | Unlimited |
| Modules | Professional + Multi Branch, API, WhatsApp, Mobile App, Priority Support |

---

## 6. Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite) |
| Backend | .NET 8 Web API |
| Database | PostgreSQL |
| Auth | JWT (`company_id`, `branch_id`, role) |
| Tenancy | Shared DB + `company_id` column |

---

## 7. API Endpoints (SaaS)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/platform/companies` | Create new tenant |
| `GET /api/platform/companies` | List all companies |
| `GET /api/platform/plans` | List subscription plans |
| `PUT /api/platform/companies/{id}/subscription` | Change plan |
| `GET /api/platform/billing` | Billing summary |
| `GET /api/subscription/current` | Current company plan & features |

---

## 8. Onboarding Flow

1. Super Admin creates company (code, name, plan).  
2. System creates default head-office branch.  
3. System creates company Admin user.  
4. Company Admin logs in → sees modules per plan.  
5. Booking limit enforced on Starter plan (500/month).  

---

## 9. Migration from Single-Tenant

Existing data is assigned to **Default Transport Co.** (`company_id = DEFAULT`).  
Platform login: `admin` / `admin123` (no company_id).  
Default company uses **Professional** plan.

---

*End of Document*
