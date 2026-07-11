# TMS Pro — User Requirements Document

**Product:** TMS Pro (Transport Management System)  
**Document type:** User Requirements (URD)  
**Version:** 1.0  
**Date:** July 2026  
**Status:** Draft for review  
**Related documents:** `TMS_Pro_Software_Use_Cases.md`, `WORKFLOWS.md`, `TMS_SaaS_Product_Architecture.md`

---

## 1. Document Purpose

This document captures **what users need** from TMS Pro — the business goals, functional requirements, user stories, acceptance criteria, and non-functional expectations. It is written for product owners, business stakeholders, QA, and implementation teams.

Implementation details (API routes, schema, architecture) are covered in separate technical documents.

---

## 2. Business Context

### 2.1 Problem Statement

Transport operators in India manage bookings, lorry receipts (LR), fleet, drivers, customer collections, broker payables, trip expenses, GST billing, and accounting across spreadsheets, paper LR books, and disconnected tools. This leads to:

- Incorrect customer outstanding balances  
- Delayed billing and GST reconciliation  
- Poor visibility into vehicle-wise profitability  
- Manual payroll and attendance tracking  
- Limited customer self-service for shipment tracking  

### 2.2 Product Vision

TMS Pro is an **enterprise Transport Management System** delivered as **multi-tenant SaaS**, enabling transport businesses to run the full lifecycle from booking → LR → trip → delivery → billing → accounting → HR → payroll in one integrated application.

### 2.3 Target Users

| Stakeholder | Description |
|-------------|-------------|
| Transport company owner / director | Needs profitability, outstanding, and compliance visibility |
| Operations / dispatch staff | Creates bookings, LRs, assigns fleet, tracks trips |
| Accounts / finance team | Manages vouchers, GST, bills, ledgers, collections |
| HR / payroll staff | Manages employees, attendance, leave, salary runs |
| Branch manager | Operates one branch with scoped data access |
| Platform operator (SaaS) | Onboards companies, manages subscriptions and plans |
| External customer | Tracks shipments, views invoices via customer portal |

### 2.4 In Scope

- Core TMS: bookings, LR, fleet, drivers, customers, vendors, expenses  
- Finance: customer payments, broker charges, RCM/FC billing, outstanding  
- Accounting: chart of accounts, vouchers, registers, P&L, balance sheet, GST  
- Reports and dashboard KPIs  
- Multi-branch operations (Enterprise plan)  
- HR and payroll (optional module)  
- GPS fleet tracking, geofencing, maintenance (optional modules)  
- Customer portal with shipment tracking and invoices  
- SaaS platform administration (companies, plans, subscriptions)  

### 2.5 Out of Scope (v1.0)

- Native mobile apps (web-responsive UI only)  
- Direct integration with government GST filing portals  
- Full warehouse management (WMS) beyond basic enterprise stubs  
- Marketplace settlement automation (read/write limited to enterprise tier)  

---

## 3. User Roles & Access

### 3.1 Platform Roles

| Role | Requirement |
|------|-------------|
| **Platform Super Admin** | SHALL manage all tenant companies, subscription plans, billing summary, and support impersonation of a tenant when required |

### 3.2 Company Roles

| Role | Primary needs |
|------|----------------|
| **Company Admin** | Full company access, user/branch management, all modules per subscription |
| **Operator / Dispatcher** | Bookings, LR, fleet assignment, trips, GPS, day-to-day operations |
| **Accountant** | Accounting, billing, outstanding, reports, provisions; no fleet write access |
| **Branch Manager** | All operational data for assigned branch only |
| **HR / Payroll User** | Employee master, attendance, leave, payroll processing |
| **Driver** (enterprise) | View assigned trips, update status, capture POD |
| **Customer (portal)** | Track shipments, view/download invoices, optional POD confirmation |

### 3.3 Access Control Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-SEC-01 | The system SHALL authenticate staff users with username and password and issue a session token (JWT). | Must |
| UR-SEC-02 | The system SHALL restrict API and UI access based on user role and subscription plan. | Must |
| UR-SEC-03 | The system SHALL isolate each company's data; users SHALL NOT see another company's records. | Must |
| UR-SEC-04 | Branch-scoped users SHALL only view and modify data for their assigned branch when multi-branch is enabled. | Should |
| UR-SEC-05 | Customer portal users SHALL only access shipments and invoices linked to their customer account. | Must |
| UR-SEC-06 | The system SHALL support public shipment tracking via a shareable link without login (read-only). | Should |

---

## 4. Functional Requirements by Module

### 4.1 Authentication & Session

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | Users SHALL log in via a web login page and be redirected to the dashboard on success. | Must |
| FR-AUTH-02 | The system SHALL display a clear error when credentials are invalid or the account is inactive. | Must |
| FR-AUTH-03 | Users SHALL log out and invalidate the client session. | Must |
| FR-AUTH-04 | Protected pages SHALL redirect unauthenticated users to the login page. | Must |
| FR-AUTH-05 | Customer portal SHALL have a separate login flow scoped to portal users. | Must |

**User story:** As an operations user, I want to log in securely so that only authorized staff can access booking and fleet data.

**Acceptance criteria:**
- Valid credentials grant access within 3 seconds under normal load  
- Invalid credentials show an error without revealing which field failed  
- Session persists across page refresh until logout or token expiry  

---

### 4.2 Dashboard & Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DASH-01 | The dashboard SHALL show KPIs: bookings count, revenue, expenses, fleet status, and recent activity. | Must |
| FR-DASH-02 | The dashboard SHALL display cash and bank balances derived from accounting transactions. | Must |
| FR-DASH-03 | Users SHALL filter dashboard metrics by date range and branch (when applicable). | Should |
| FR-DASH-04 | Charts SHALL reflect current database state with reasonable refresh latency. | Should |

**User story:** As a company admin, I want a single dashboard so that I can assess business health without running multiple reports.

---

### 4.3 Master Data Management

#### Customers

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CUST-01 | Users SHALL create, view, edit, and list customers with name, contact, GSTIN, and credit limit. | Must |
| FR-CUST-02 | Customer list SHALL show current outstanding balance from booking receivables. | Must |
| FR-CUST-03 | Customers SHALL be selectable when creating bookings. | Must |

#### Vendors

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-VEND-01 | Users SHALL maintain vendor master data (name, category, contact). | Must |
| FR-VEND-02 | Vendor outstanding SHALL reflect linked expenses and payables. | Must |

#### Vehicles

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-VEH-01 | Users SHALL register vehicles with number, type, capacity, and compliance dates. | Must |
| FR-VEH-02 | Users SHALL view vehicle profile including maintenance history when maintenance module is enabled. | Should |
| FR-VEH-03 | Vehicles SHALL be assignable to bookings, LRs, and trips. | Must |

#### Drivers

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DRV-01 | Users SHALL maintain driver records (name, phone, license, salary). | Must |
| FR-DRV-02 | Drivers SHALL be assignable to bookings, LRs, and trips. | Must |
| FR-DRV-03 | Driver records MAY link to HR employee records when HR module is enabled. | Should |

#### Brokers

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-BRK-01 | The system SHALL create or link broker master records when broker charges are entered on a booking. | Must |
| FR-BRK-02 | Broker outstanding report SHALL list payables by broker. | Must |

**User story:** As an operator, I want to maintain customers, vehicles, and drivers in one place so that booking entry is fast and accurate.

---

### 4.4 Booking Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-BKG-01 | Users SHALL create bookings with customer, consignor, consignee, route (from/to), material, quantity, freight, and optional advance. | Must |
| FR-BKG-02 | The system SHALL auto-generate a unique booking reference (e.g. BK-1043). | Must |
| FR-BKG-03 | The system SHALL calculate booking balance as freight minus advance and payments. | Must |
| FR-BKG-04 | Users SHALL assign vehicle and driver to a booking. | Must |
| FR-BKG-05 | Users SHALL update booking status through the lifecycle: Pending → Confirmed → In Transit → Delivered → Closed. | Must |
| FR-BKG-06 | Users SHALL view booking list with search and filters (date, customer, status, branch). | Must |
| FR-BKG-07 | Users SHALL edit booking details and recalculate balance when freight or advance changes. | Must |
| FR-BKG-08 | Users SHALL delete bookings only when business rules allow (e.g. no dependent LR/bills). | Should |

**User story:** As an operations user, I want to create a booking with freight and advance so that customer outstanding is tracked from day one.

**Acceptance criteria:**
- Booking saves with generated ID and visible balance  
- Advance reduces outstanding immediately  
- Booking appears in customer ledger and outstanding report  

**Reference scenario (BK-1043):** Vedant Enterprises, Pune → Mumbai, freight ₹45,000, advance ₹10,000 → customer owes ₹35,000.

---

### 4.5 Booking Finance

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-BF-01 | Users SHALL record customer payments against a booking (cash, UPI, NEFT, cheque, etc.). | Must |
| FR-BF-02 | Payment amount SHALL NOT exceed booking outstanding; system SHALL validate and reject overpayment. | Must |
| FR-BF-03 | The system SHALL update payment status: Paid, Partial, or Unpaid. | Must |
| FR-BF-04 | Users SHALL add broker charges (broker name, type, amount, remarks) linked to a booking. | Must |
| FR-BF-05 | Users SHALL add trip-level expenses (Fuel, Toll, Hamali, Detention, Other) with optional vendor. | Must |
| FR-BF-06 | Booking finance panel SHALL show income, costs, margin, and all linked transactions. | Must |
| FR-BF-07 | Payments SHALL appear in customer ledger, cash flow, and cash book. | Must |

**User story:** As an accountant, I want to record a ₹3,000 cash payment on BK-1043 so that customer outstanding updates to ₹32,000.

---

### 4.6 Lorry Receipt (LR)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LR-01 | Users SHALL generate an LR from a booking with prefilled consignor, consignee, route, vehicle, driver, freight, and GST. | Must |
| FR-LR-02 | LR generation SHALL carry forward advance (booking advance + all payments) and applicable charges. | Must |
| FR-LR-03 | Users SHALL create, edit, view, print, and delete LRs independently of bookings. | Must |
| FR-LR-04 | The system SHALL assign a unique LR number and calculate LR balance. | Must |
| FR-LR-05 | LR data SHALL feed trip reports, vehicle ledger, and GST reports. | Must |
| FR-LR-06 | Users SHALL print LR in a standard printable format with company branding from settings. | Must |

**User story:** As an operator, I want to generate an LR from a booking so that legal consignment documentation matches financial data already captured.

---

### 4.7 Transport Billing (RCM / FC)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-BILL-01 | Users SHALL generate RCM bills with 5% GST on taxable amount. | Must |
| FR-BILL-02 | Users SHALL generate FC (Freight Collection) bills with 18% GST on taxable amount. | Must |
| FR-BILL-03 | Bill lines SHALL include freight, booking expenses, and LR charges (loading, unloading, insurance) when linked. | Must |
| FR-BILL-04 | Bills SHALL show taxable amount, GST, advance credit, gross total, and balance due. | Must |
| FR-BILL-05 | The system SHALL assign sequential bill numbers (e.g. FC-2026-0001). | Must |
| FR-BILL-06 | Users SHALL print bills and delete incorrectly generated bills with confirmation. | Must |
| FR-BILL-07 | Deleting a bill SHALL NOT alter booking balance or recorded payments. | Must |

**User story:** As an accountant, I want to generate an FC bill that shows advance and balance due so that the customer receives a GST-compliant invoice.

---

### 4.8 Trips & Operations (Enterprise)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TRIP-01 | Users SHALL create and manage trips with stops, vehicle assignment, and status updates. | Should |
| FR-TRIP-02 | Users SHALL link trips to bookings and LRs. | Should |
| FR-TRIP-03 | Route optimizer SHALL suggest efficient routes when routing module is enabled. | Could |
| FR-TRIP-04 | Users SHALL manage shipments as part of operational workflow. | Should |
| FR-TRIP-05 | Drivers SHALL view assigned trips and update delivery status (enterprise role). | Could |

---

### 4.9 Electronic Proof of Delivery (ePOD)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-POD-01 | Users SHALL confirm delivery with OTP verification when notifications are configured. | Should |
| FR-POD-02 | POD confirmation SHALL update booking/trip delivery status. | Should |
| FR-POD-03 | Customers SHALL view POD status in the portal when available. | Should |

---

### 4.10 Expense Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-EXP-01 | Users SHALL record company-wide expenses not tied to a booking (fuel, maintenance, office, etc.). | Must |
| FR-EXP-02 | Expense entry SHALL support date, category, amount, vehicle, vendor, and payment mode. | Must |
| FR-EXP-03 | Expenses SHALL appear in P&L, cash flow, and vehicle ledger when vehicle is linked. | Must |
| FR-EXP-04 | Users SHALL list, filter, and export expenses. | Must |

---

### 4.11 Accounting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ACC-01 | The system SHALL maintain chart of accounts and ledger master. | Must |
| FR-ACC-02 | Users SHALL post vouchers: Receipt, Payment, Journal, Contra, Sales, Purchase. | Must |
| FR-ACC-03 | Vouchers SHALL reflect in cash book, bank book, day book, and journal registers. | Must |
| FR-ACC-04 | Users SHALL view trial balance, profit & loss, and balance sheet. | Must |
| FR-ACC-05 | Users SHALL view customer, vendor, driver, and vehicle ledger reports with running balance. | Must |
| FR-ACC-06 | Users SHALL view outstanding report for customers, vendors, and brokers. | Must |
| FR-ACC-07 | Users SHALL view GST report with output GST from LRs and bills. | Must |
| FR-ACC-08 | Users SHALL manage accounting provisions for party/vendor liabilities. | Should |
| FR-ACC-09 | Payroll "Mark Paid" SHALL auto-post accounting vouchers. | Should |
| FR-ACC-10 | Ledger reports SHALL support date range and party filters with export/print. | Must |

**User story:** As an accountant, I want a customer ledger showing freight debits before payment credits on the same date so that I can reconcile receivables with the customer.

---

### 4.12 Reports

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RPT-01 | Users SHALL access trip, income, expense, and cash flow reports. | Must |
| FR-RPT-02 | Users SHALL access booking P&L and broker outstanding reports. | Must |
| FR-RPT-03 | Cash flow report SHALL support monthly summary with drill-down to line items (payments, advances, expenses, broker charges). | Must |
| FR-RPT-04 | Vehicle utilization and driver performance reports SHALL be available when trip/GPS data exists. | Should |
| FR-RPT-05 | Reports SHALL support CSV export and print. | Must |
| FR-RPT-06 | All reports SHALL respect branch scope for branch-scoped users. | Should |

---

### 4.13 HR Module

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-HR-01 | Users SHALL manage departments and employee records (Permanent, Contract, Daily). | Should |
| FR-HR-02 | Users SHALL mark daily attendance individually or in bulk ("mark all present"). | Should |
| FR-HR-03 | Employees SHALL apply for leave; approvers SHALL approve or reject. | Should |
| FR-HR-04 | Users SHALL maintain holiday calendar. | Should |
| FR-HR-05 | Driver employees SHALL support transport-specific fields (license, allowances). | Should |
| FR-HR-06 | HR data SHALL feed payroll calculations. | Should |

**User story:** As an HR user, I want to mark monthly attendance in bulk so that payroll generation has accurate attendance days.

---

### 4.14 Payroll Module

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PAY-01 | Users SHALL configure payroll settings (PF, ESI, trip bonus, deductions). | Should |
| FR-PAY-02 | Users SHALL generate payroll for a selected month/year. | Should |
| FR-PAY-03 | Payroll calculation SHALL differ by employment type: Permanent (full salary + statutory), Contract (contract amount), Daily (daily wage × attendance days). | Should |
| FR-PAY-04 | Payroll runs SHALL follow workflow: Draft → Processed → Paid (or Cancelled). | Should |
| FR-PAY-05 | Users SHALL view per-employee breakdown, print payslips, and export salary register. | Should |
| FR-PAY-06 | Marking payroll as Paid SHALL post accounting entries. | Should |

---

### 4.15 GPS & Fleet Tracking

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-GPS-01 | Users SHALL view live fleet positions on a map when GPS module is enabled. | Should |
| FR-GPS-02 | Users SHALL view vehicle route history for a selected period. | Should |
| FR-GPS-03 | Users SHALL create geofences and assign them to vehicles. | Should |
| FR-GPS-04 | The system SHALL record geofence entry/exit events and surface alerts. | Should |
| FR-GPS-05 | GPS devices or simulators SHALL ingest position data via API. | Should |

---

### 4.16 Maintenance

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-MNT-01 | Users SHALL define maintenance schedules per vehicle (date/odometer based). | Should |
| FR-MNT-02 | Users SHALL record completed service and breakdown work orders. | Should |
| FR-MNT-03 | The system SHALL alert when maintenance is due or overdue. | Should |
| FR-MNT-04 | Spare parts inventory MAY be tracked when configured. | Could |

---

### 4.17 Customer Portal

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PORT-01 | Staff SHALL grant portal access to customers. | Must |
| FR-PORT-02 | Customers SHALL log in and view their shipment list and status. | Must |
| FR-PORT-03 | Customers SHALL track a shipment by booking ID with timeline. | Must |
| FR-PORT-04 | Customers SHALL view and download invoices. | Must |
| FR-PORT-05 | Public tracking link SHALL allow read-only status without login. | Should |
| FR-PORT-06 | Portal login SHALL not reveal whether a customer code exists (anti-enumeration). | Must |

**User story:** As a customer, I want to track my Pune–Mumbai shipment online so that I do not need to call the operations desk for status updates.

---

### 4.18 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NOT-01 | The system SHALL support in-app notifications for business events. | Should |
| FR-NOT-02 | Admins SHALL configure notification channels (SMS, WhatsApp via MSG91) in settings. | Should |
| FR-NOT-03 | Events (booking status, geofence, POD) SHALL trigger notifications when configured. | Should |

---

### 4.19 Settings & Administration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SET-01 | Company admin SHALL configure company profile and print branding (name, address, GSTIN on documents). | Must |
| FR-SET-02 | Admin SHALL manage branches (create, edit) when multi-branch is enabled. | Should |
| FR-SET-03 | Admin SHALL create and manage staff users with roles. | Must |
| FR-SET-04 | Admin SHALL configure portal users and notification preferences. | Should |
| FR-SET-05 | Users SHALL select active branch from header when multi-branch is enabled. | Should |

---

### 4.20 SaaS Platform Administration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PLAT-01 | Platform admin SHALL create tenant companies with code, name, and subscription plan. | Must |
| FR-PLAT-02 | On company creation, the system SHALL create default head-office branch and company admin user. | Must |
| FR-PLAT-03 | Platform admin SHALL list companies and change subscription plans. | Must |
| FR-PLAT-04 | Platform admin SHALL view billing summary across tenants. | Should |
| FR-PLAT-05 | Company users SHALL see only modules included in their subscription plan. | Must |
| FR-PLAT-06 | Starter plan SHALL enforce booking limit (500/month) and user limit (2). | Must |

#### Subscription plan entitlements

| Plan | Users | Bookings/month | Modules |
|------|-------|----------------|---------|
| Starter (₹999/mo) | 2 | 500 | Booking, LR, Billing, Outstanding |
| Professional (₹2,499/mo) | Unlimited | Unlimited | Starter + Accounting, Dashboard, P&L, Balance Sheet, GST, Export |
| Enterprise (custom) | Unlimited | Unlimited | Professional + Multi-branch, API, WhatsApp, Mobile App, Priority Support |

---

## 5. Business Rules

| ID | Rule |
|----|------|
| BR-01 | Booking balance = freight − advance − sum(payments). |
| BR-02 | Customer outstanding aggregates booking balances across open bookings. |
| BR-03 | Payment against a booking cannot exceed remaining outstanding. |
| BR-04 | RCM GST rate = 5% on taxable amount; FC GST rate = 18%. |
| BR-05 | Taxable amount on bills = freight + applicable other charges. |
| BR-06 | Bill balance due = gross total (incl. GST) − advance credit. |
| BR-07 | Deleting a transport bill does not reverse payments or alter booking balance. |
| BR-08 | LR advance includes booking advance plus all recorded payments. |
| BR-09 | All business records belong to exactly one company (`company_id`). |
| BR-10 | Branch-scoped users see only records for their `branch_id`. |
| BR-11 | Freight ledger entries appear before payment credits on the same date in customer ledger. |
| BR-12 | Broker charges are company costs and appear in broker outstanding and booking P&L. |
| BR-13 | Trip expenses linked to a booking affect booking P&L and vehicle ledger. |
| BR-14 | Payroll daily-wage employees: net pay based on attendance days × daily rate. |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | Login and dashboard load | < 3 seconds on standard broadband |
| NFR-PERF-02 | List pages (bookings, customers) | Paginated; first page < 2 seconds |
| NFR-PERF-03 | Report generation | < 10 seconds for typical date ranges |
| NFR-PERF-04 | Dashboard charts | Cached refresh ≤ 5 minutes acceptable |

### 6.2 Security

| ID | Requirement |
|----|-------------|
| NFR-SEC-01 | Passwords SHALL be stored hashed (BCrypt). |
| NFR-SEC-02 | API SHALL require valid JWT for protected endpoints. |
| NFR-SEC-03 | Auth endpoints SHALL be rate limited to prevent brute force. |
| NFR-SEC-04 | Tenant isolation SHALL be enforced on all business data queries. |
| NFR-SEC-05 | Platform admin cross-tenant access SHALL be restricted to designated roles only. |

### 6.3 Availability & Reliability

| ID | Requirement |
|----|-------------|
| NFR-AVL-01 | API health endpoint SHALL report database connectivity. |
| NFR-AVL-02 | System SHALL support single-server deployment for 50–200 tenants (typical volume). |
| NFR-AVL-03 | Core financial calculations SHALL be consistent after any supported transaction. |

### 6.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-UX-01 | UI SHALL be usable on desktop browsers (Chrome, Edge, Firefox). |
| NFR-UX-02 | Forms SHALL validate required fields before submit with clear error messages. |
| NFR-UX-03 | Destructive actions (delete bill, delete LR) SHALL require confirmation. |
| NFR-UX-04 | Printable documents (LR, bills, payslips) SHALL use company branding from settings. |
| NFR-UX-05 | Navigation SHALL group modules logically: Operations, Accounting, Reports, HR, Settings. |

### 6.5 Audit & Compliance

| ID | Requirement |
|----|-------------|
| NFR-AUD-01 | Core entities SHALL store created/updated timestamps. |
| NFR-AUD-02 | GST reports SHALL align with LR and bill GST amounts for filing preparation. |
| NFR-AUD-03 | Financial reports SHALL be filterable by date, customer, vendor, and branch. |

### 6.6 Scalability (Roadmap)

| ID | Requirement |
|----|-------------|
| NFR-SCL-01 | Architecture SHALL support horizontal API scaling with shared cache (Redis) in future releases. |
| NFR-SCL-02 | Reporting SHALL support read replicas for heavy query offload in future releases. |

---

## 7. Integration Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| INT-01 | REST API for all core CRUD and report operations | Must |
| INT-02 | Swagger/OpenAPI documentation for API consumers | Should |
| INT-03 | GPS device ingest endpoint for telematics partners | Should |
| INT-04 | MSG91 integration for SMS/WhatsApp notifications | Should |
| INT-05 | Enterprise plan API access for third-party ERP/accounting | Could |

---

## 8. Data Requirements

| ID | Requirement |
|----|-------------|
| DR-01 | All monetary amounts in Indian Rupees (INR) with 2 decimal precision. |
| DR-02 | Dates stored in UTC; displayed in company/local timezone. |
| DR-03 | GSTIN format validation on customer/vendor/company records. |
| DR-04 | Unique booking, LR, and bill numbers per company. |
| DR-05 | Soft-delete or hard-delete policy documented per entity (bills deletable; bookings restricted when dependents exist). |

---

## 9. Constraints & Assumptions

### 9.1 Constraints

- Web application stack: React (Vite) frontend, .NET 8 API, PostgreSQL database  
- Multi-tenant shared schema with row-level `company_id` isolation  
- JWT bearer authentication  
- India-specific GST rules (RCM 5%, FC 18%)  

### 9.2 Assumptions

- Users have reliable internet access for web UI  
- Company admin completes initial master data setup before daily operations  
- Optional modules (HR, GPS, maintenance, portal) require one-time database install scripts  
- Customers receive portal credentials from transport company staff  

---

## 10. Traceability Matrix (Requirements → Use Cases)

| Requirement area | Use case IDs (see Use Case Document) |
|------------------|--------------------------------------|
| Authentication | UC-01 |
| Dashboard | UC-02 |
| Bookings | UC-03, UC-04 |
| Booking finance | UC-05, UC-06, UC-07 |
| Billing | UC-08, UC-09 |
| LR | UC-10, UC-11 |
| Master data | UC-12 – UC-15 |
| Expenses | UC-16 |
| Accounting & reports | UC-17 – UC-24 |
| Payroll | UC-25 |
| HR | UC-26 |
| GPS | UC-27 |
| Customer portal | UC-28 |
| Settings | UC-29 |

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **Booking** | Transport order capturing freight, parties, and route before or without formal LR |
| **LR (Lorry Receipt)** | Legal consignment document for a trip |
| **RCM** | Reverse Charge Mechanism — GST invoice at 5% |
| **FC** | Freight Collection bill — GST invoice at 18% |
| **Advance** | Amount received from customer before trip completion |
| **Outstanding** | Amount still due from customer on freight |
| **Broker charge** | Commission or fee payable to a transport broker |
| **Provision** | Accounting accrual for party or vendor liability |
| **ePOD** | Electronic proof of delivery |
| **Tenant** | A subscribing transport company in the SaaS model |

---

## 12. Acceptance & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Business Stakeholder | | | |
| Technical Lead | | | |
| QA Lead | | | |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | July 2026 | TMS Pro Team | Initial user requirements document |

---

*End of Document*
