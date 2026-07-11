# TMS Pro — Complete Workflow Guide (All Scenarios)

Transport Management System covering booking → LR → trip → delivery → billing → accounting → HR → payroll.

---

## 1. System Actors & Entry Points

```mermaid
flowchart TB
  subgraph Users
    SA[Super Admin]
    BM[Branch Manager]
    ACC[Accountant]
    OPS[Operations Manager]
    CUST[Customer]
  end

  subgraph Apps
    WEB[Staff UI — React<br/>localhost:5173]
    API[.NET 8 API<br/>localhost:5000/api]
    PORTAL[Customer Portal<br/>localhost:5173/portal]
  end

  subgraph Data
    PG[(PostgreSQL tms_pro)]
  end

  SA & BM & ACC & OPS --> WEB
  CUST --> PORTAL
  WEB --> API
  PORTAL --> API
  API --> PG
```

| Actor | Login | Default access |
|-------|--------|----------------|
| Super Admin | `/login` → `admin` / `admin123` | All branches, all modules |
| Branch Manager | `/login` | Own branch data only |
| Accountant | `/login` | Accounting, reports, payroll |
| Operations | `/login` | Bookings, LR, fleet, GPS, trips |
| Customer | `/portal/login` | Track shipments, invoices, POD |

---

## 2. Authentication Workflows

### 2.1 Staff Login

```mermaid
sequenceDiagram
  participant U as User
  participant UI as React UI
  participant API as POST /api/auth/login
  participant DB as users table

  U->>UI: Enter username + password
  UI->>API: LoginRequest
  API->>DB: Find user + BCrypt verify
  alt Valid
    API-->>UI: JWT token + role + branch
    UI->>UI: Store token (localStorage)
    UI-->>U: Redirect to Dashboard
  else Invalid
    API-->>UI: 401 Unauthorized
    UI-->>U: Show error message
  end
```

### 2.2 Customer Portal Login

```mermaid
sequenceDiagram
  participant C as Customer
  participant P as Portal UI
  participant API as POST /api/portal/auth/login
  participant DB as portal_access

  C->>P: Customer code + PIN / password
  P->>API: Portal credentials
  API->>DB: Validate access scope
  API-->>P: Portal JWT (booking or customer scope)
  P-->>C: Shipments / invoices dashboard
```

### 2.3 Public Tracking (no login)

```mermaid
flowchart LR
  A[Share link<br/>/portal/shared/:bookingId] --> B[GET /api/portal/public/track]
  B --> C[Show booking status + timeline]
```

---

## 3. Core Transport Workflow (End-to-End)

Primary business path from enquiry to payment.

```mermaid
flowchart TD
  A[Master Data Setup] --> B[Create Booking]
  B --> C{Assign Vehicle<br/>& Driver?}
  C -->|Yes| D[Update Booking Status]
  C -->|No| D
  D --> E[Generate LR<br/>Lorry Receipt]
  E --> F[Create / Assign Trip]
  F --> G[GPS Tracking<br/>optional]
  G --> H[Delivery + ePOD<br/>OTP proof]
  H --> I[Update Payment Status<br/>Paid / To Pay / Balance]
  I --> J[Record Expenses]
  J --> K[Accounting Vouchers<br/>Receipt / Sales]
  K --> L[Reports & GST]

  subgraph Master["A — Master Data (one-time)"]
    A1[Customers]
    A2[Vendors]
    A3[Vehicles]
    A4[Drivers]
    A5[Branches]
  end
  A --> Master
```

### 3.1 Booking Scenario

| Step | UI Path | API | Status flow |
|------|---------|-----|-------------|
| 1 | Bookings → Add New | `POST /api/bookings` | Pending |
| 2 | Booking Details → Edit | `PUT /api/bookings/{id}` | Confirmed / In Transit |
| 3 | Assign vehicle/driver | Same | Assigned |
| 4 | Complete delivery | Same | Delivered / Closed |

### 3.2 LR (Lorry Receipt) Scenario

| Step | UI Path | API |
|------|---------|-----|
| 1 | LR Management → Generate LR | `POST /api/lr/generate` |
| 2 | LR List → View / Print | `GET /api/lr` |
| 3 | Print LR format | Frontend print component |

### 3.3 Trip & Operations Scenario

| Step | UI Path | API |
|------|---------|-----|
| 1 | Operations → Trips | `GET/POST /api/trips` |
| 2 | Add stops, assign vehicle | Trip workflow |
| 3 | Operations → Route Optimizer | `POST /api/routing/optimize` |
| 4 | Operations → Shipments | `GET/POST /api/shipments` |

### 3.4 ePOD Scenario

```mermaid
sequenceDiagram
  participant D as Driver / Ops
  participant UI as ePOD Page
  participant API as /api/pod
  participant C as Customer

  D->>UI: Select booking / LR
  UI->>API: Request OTP
  API-->>C: SMS / notification (if configured)
  C->>D: Share OTP
  D->>UI: Enter OTP + delivery notes
  UI->>API: Confirm POD
  API-->>UI: Delivery confirmed
```

---

## 4. Fleet & GPS Workflows

### 4.1 Live GPS Tracking

```mermaid
flowchart LR
  DEV[GPS Device / Simulator] -->|POST /api/gps/ingest| API
  API --> DB[(gps_tracks<br/>vehicle_last_position)]
  UI[Fleet Map] -->|GET /api/gps/live| API
  API --> UI
```

### 4.2 Geofence Alerts

```mermaid
flowchart TD
  A[Create Geofence<br/>Operations → GPS → Geofences] --> B[Assign to vehicles]
  B --> C[Vehicle enters/exits zone]
  C --> D[geofence_events recorded]
  D --> E[Alerts page + notifications]
```

### 4.3 Predictive Maintenance

| Step | Action |
|------|--------|
| 1 | `npm run maintenance:install` — DB schema |
| 2 | Maintenance page — schedules per vehicle |
| 3 | Record service / breakdown |
| 4 | Alerts when due odometer/date reached |

---

## 5. HR Workflow (All Scenarios)

```mermaid
flowchart TD
  SETUP[Install HR module<br/>npm run hr:install] --> DEPT[Departments]
  DEPT --> EMP[Add Employee<br/>Permanent / Contract / Daily]
  EMP --> ATT[Daily Attendance<br/>Mark all present / individual]
  EMP --> LEAVE[Leave Management<br/>Apply → Approve/Reject]
  EMP --> HOL[Holidays calendar]
  EMP --> NORM[TMS Transport Norms<br/>Driver allowances, license]
  ATT & LEAVE --> PAY[Payroll Generation]
```

| Scenario | UI | API |
|----------|-----|-----|
| New employee | HR → Employees → Add | `POST /api/hr/employees` |
| Edit driver with fleet fields | Employee form (TMS section) | `sp_hr_save_employee` |
| Mark attendance | HR → Attendance | `GET/POST /api/hr/attendance` |
| Bulk present | Mark All Active Present | `POST /api/hr/attendance/bulk` |
| Apply leave | HR → Leave → Apply | `POST /api/hr/leaves` |
| Approve leave | Pending list → Approve | `POST /api/hr/leaves/{id}/approve` |

---

## 6. Payroll Workflow (All Scenarios)

```mermaid
stateDiagram-v2
  [*] --> Draft: Generate Payroll
  Draft --> Processed: Process Run
  Processed --> Paid: Mark Paid + Accounting
  Paid --> [*]
  Draft --> Cancelled: Cancel Run
  Cancelled --> [*]
```

| Step | UI | API | Notes |
|------|-----|-----|-------|
| 1 Configure | Payroll → Settings | `GET/PUT /api/payroll/settings` | PF, ESI, trip bonus, etc. |
| 2 Generate | Payroll → Generate | `POST /api/payroll/generate` | Month + year |
| 3 Review | Payroll Runs → Details | `GET /api/payroll/runs/{id}/entries` | Per-employee breakdown |
| 4 Process | Process button | `POST /api/payroll/runs/{id}/process` | Locks calculations |
| 5 Pay | Mark Paid | `POST /api/payroll/runs/{id}/pay` | Posts accounting voucher |
| 6 Payslip | Payslips → Print | `GET /api/payroll/payslips/{id}` | PDF/print |
| 7 Register | Salary Register | `GET /api/payroll/salary-register` | Export/report |

**Employment types in payroll calculation:**
- **Permanent** — full monthly salary, PF, ESI, insurance
- **Contract** — contract amount, reduced allowances
- **Daily** — daily wage × attendance days

---

## 7. Accounting Workflow

```mermaid
flowchart TD
  COA[Chart of Accounts] --> LM[Ledger Master]
  LM --> VE[Voucher Entry<br/>Receipt / Payment / Journal / Contra]
  VE --> REG[Registers<br/>Cash / Bank / Day / Journal]
  REG --> TB[Trial Balance]
  TB --> PL[Profit & Loss]
  TB --> BS[Balance Sheet]
  VE --> GST[GST Reports]
  VE --> OUT[Outstanding<br/>Customer / Vendor]
```

| Voucher type | Use case |
|--------------|----------|
| Receipt | Customer freight payment |
| Payment | Vendor / driver / expense payment |
| Journal | Adjustments, payroll accrual |
| Contra | Cash ↔ Bank transfer |
| Sales | Freight invoice posting |
| Purchase | Vendor bills |

**Payroll integration:** Mark Paid on payroll run auto-creates accounting voucher.

---

## 8. Expense Workflow

```mermaid
flowchart LR
  A[Expenses → Add New] --> B[Category + amount + vehicle/trip]
  B --> C[POST /api/expenses]
  C --> D[Expense List / Reports]
  D --> E[Accounting link optional]
```

---

## 9. Customer Portal Workflow

```mermaid
flowchart TD
  LOGIN[Portal Login] --> DASH[My Shipments]
  DASH --> TRACK[Track shipment<br/>/portal/track/:id]
  DASH --> INV[Invoices list]
  INV --> VIEW[Invoice detail + PDF]
  STAFF[Staff: Operations → Customer Portal] --> GRANT[Grant portal access to customer]
  GRANT --> LOGIN
```

---

## 10. Notifications Workflow

```mermaid
flowchart LR
  EVT[Business event<br/>booking status, geofence, POD] --> OUT[Notification outbox]
  OUT --> W[WhatsApp via MSG91]
  OUT --> S[SMS]
  OUT --> I[In-app bell]
  CFG[Settings → Notifications] --> OUT
```

---

## 11. Multi-Branch Scenario

```mermaid
flowchart TD
  HO[Head Office — all branches] --> SEL[Branch selector in header]
  BM[Branch Manager login] --> OWN[Sees own branch only]
  SEL --> FILTER[Bookings / vehicles / reports filtered by branch_id]
```

Install: `npm run branches:install`

---

## 12. Reports Workflow

| Report | Path | Data source |
|--------|------|-------------|
| Trip report | `/reports/trips` | trips + bookings |
| Vehicle utilization | `/reports/vehicles` | vehicles + GPS |
| Driver performance | `/reports/drivers` | drivers + trips |
| Income / expense | `/reports/income`, `/reports/expenses` | accounting |
| Cash flow | `/reports/cash-flow` | vouchers |
| Dashboard analytics | `/` (Dashboard tabs) | aggregated KPIs |

---

## 13. Deployment & Install Scenarios

```mermaid
flowchart TD
  DEV[Development] --> LOCAL[npm run dev + npm run dev:api]
  LOCAL --> FE[localhost:5173]
  LOCAL --> BE[localhost:5000]

  subgraph DBInstall["Database modules (run once)"]
    HR[npm run hr:install]
    GPS[npm run gps:install]
    MAINT[npm run maintenance:install]
    MOD[npm run modules:install]
    NOTIF[npm run notifications:install]
    PORT[npm run portal:install]
    ROUTE[npm run routing:install]
    BR[npm run branches:install]
  end

  PG[(PostgreSQL tms_pro)] --> DBInstall
```

### Environment variables (Production)

| Variable | Purpose |
|----------|---------|
| `TMS_CONNECTION_STRING` | PostgreSQL connection |
| `TMS_JWT_KEY` | JWT signing (32+ chars) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `PGPASSWORD` / `TMS_PG_PASSWORD` | For install scripts |

---

## 14. Typical Day-in-Life Scenarios

### Scenario A — New freight booking (Operations)

1. Login → Dashboard
2. Customers (verify exists) → Bookings → New Booking
3. Fill consignor, consignee, route, freight, payment type
4. Save → Generate LR → Print for driver
5. Operations → Trips → assign vehicle
6. Fleet map → monitor movement
7. ePOD on delivery → update payment status

### Scenario B — Month-end payroll (HR + Accounts)

1. HR → Attendance → mark month / bulk present
2. HR → Leave → approve pending requests
3. Payroll → Settings → verify PF/ESI rates
4. Payroll → Generate → select month/year
5. Review run → Process → Mark Paid
6. Accounting → verify voucher posted
7. Payslips → distribute to employees

### Scenario C — Customer tracks shipment

1. Staff grants portal access (Settings → Portal Users)
2. Customer logs in at `/portal/login`
3. Views shipment list → opens track page
4. Optional: receives SMS on status change

### Scenario D — Vehicle maintenance due

1. Maintenance page → view due schedules
2. Record service when completed
3. Update odometer on vehicle master
4. Dashboard alerts if overdue

---

## 15. API Health Check

```
GET /api/health
→ { "status": "healthy", "service": "TMS Pro API", "database": "connected" }
```

---

## 16. Module Dependency Map

```mermaid
flowchart BT
  CORE[Core TMS<br/>Bookings LR Vehicles Drivers]
  ACC[Accounting]
  HR[HR Module]
  PAY[Payroll Module]
  GPS[GPS Module]
  PORT[Portal Module]
  NOTIF[Notifications]

  CORE --> ACC
  HR --> PAY
  PAY --> ACC
  CORE --> GPS
  CORE --> PORT
  CORE --> NOTIF
  GPS --> NOTIF
```

---

*Generated for TMS Pro — Enterprise Transport Management · India*
*Powered by [Codeestack](https://codeestack.vercel.app)*
