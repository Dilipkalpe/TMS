# TMS Pro — Software Use Case Document

**Product:** TMS Pro (Transport Management System)  
**Version:** 1.0  
**Date:** June 2026  
**Prepared for:** Business & implementation reference  

---

## 1. Introduction

### 1.1 Purpose

This document describes the functional use cases of **TMS Pro**, an enterprise Transport Management System used to manage bookings, lorry receipts (LR), fleet, drivers, customers, vendors, expenses, payroll, HR, accounting, and operational reports.

### 1.2 Scope

The system covers the full transport business lifecycle:

- Trip booking and freight management  
- Customer payments, broker charges, and trip expenses  
- LR generation and billing (RCM / FC)  
- Fleet, driver, and maintenance management  
- Accounting ledgers, GST, outstanding, and financial reports  
- Payroll and HR (where enabled)  
- GPS, routing, and customer portal (where enabled)  

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), port 5173 |
| Backend | .NET 8 Web API, port 5000 |
| Database | PostgreSQL |
| Authentication | JWT bearer token |

---

## 2. Actors

| Actor | Description |
|-------|-------------|
| **Super Admin** | Full system access; manages branches, users, and all modules |
| **Admin / Operations User** | Creates bookings, LRs, records payments, manages fleet and day-to-day operations |
| **Accounts User** | Manages vouchers, ledgers, reports, provisions, and billing |
| **HR / Payroll User** | Manages employees, attendance, leave, and payroll runs |
| **Customer (Portal User)** | External customer who tracks shipments and views invoices via customer portal |
| **System** | Automated calculations (outstanding, balances, bill totals, dashboard metrics) |

---

## 3. High-Level Business Scenario (Reference)

**Example booking BK-1043 — Vedant Enterprises, Pune → Mumbai**

| Step | Action | Result |
|------|--------|--------|
| 1 | Create booking with freight ₹45,000, advance ₹10,000 | Customer owes ₹35,000 on freight |
| 2 | Record cash payment ₹3,000 | Customer outstanding ₹32,000 |
| 3 | Add broker charge ₹12,000 | Company cost; broker payable updated |
| 4 | Generate LR from booking | Advance ₹13,000 carried; GST/charges on LR |
| 5 | Generate FC / RCM bill | Bill shows freight, other charges, advance, balance due |
| 6 | View Customer Ledger | Running balance ₹32,000 (freight − advance − payments) |
| 7 | View Outstanding Report | Vedant Enterprises ₹32,000 |
| 8 | View Vehicle Ledger | Trip income and expenses per vehicle |
| 9 | View Cash Flow Report | Inflows (advance + payments) vs outflows (expenses, broker) |

---

## 4. Use Case Summary

| UC ID | Use Case Name | Primary Actor |
|-------|---------------|---------------|
| UC-01 | User Login | All users |
| UC-02 | View Dashboard | Admin, Operations |
| UC-03 | Create Booking | Operations User |
| UC-04 | View / Edit Booking | Operations User |
| UC-05 | Record Booking Payment | Accounts / Operations |
| UC-06 | Add Broker Charge | Operations User |
| UC-07 | Add Booking Expense | Operations User |
| UC-08 | Generate RCM / FC Bill | Accounts User |
| UC-09 | Delete Transport Bill | Accounts User |
| UC-10 | Generate LR from Booking | Operations User |
| UC-11 | Create / Edit / Delete LR | Operations User |
| UC-12 | Manage Vehicles | Operations User |
| UC-13 | Manage Drivers | Operations User |
| UC-14 | Manage Customers | Operations User |
| UC-15 | Manage Vendors | Operations User |
| UC-16 | Record Global Expense | Accounts User |
| UC-17 | Customer Ledger Report | Accounts User |
| UC-18 | Vendor / Driver / Vehicle Ledger | Accounts User |
| UC-19 | Outstanding Report | Accounts User |
| UC-20 | Cash Flow Report (with details) | Accounts User |
| UC-21 | Profit & Loss / Trial Balance / Balance Sheet | Accounts User |
| UC-22 | GST Report | Accounts User |
| UC-23 | Voucher Entry (Receipt / Payment / Journal) | Accounts User |
| UC-24 | Booking P&L & Broker Outstanding Reports | Accounts User |
| UC-25 | Process Payroll | HR / Payroll User |
| UC-26 | HR Employee & Attendance Management | HR User |
| UC-27 | GPS Fleet Tracking | Operations User |
| UC-28 | Customer Portal Track Shipment | Customer |
| UC-29 | System Settings (Branches, Users) | Super Admin |

---

## 5. Detailed Use Cases

### UC-01 — User Login

**Actor:** All internal users  
**Description:** User authenticates to access the TMS application.

**Preconditions:** Valid user account exists and is active.

**Main Flow:**

1. User opens the login page.  
2. User enters username and password.  
3. System validates credentials against the database.  
4. System returns a JWT token.  
5. User is redirected to the Dashboard.

**Postconditions:** User session is active; protected routes and API calls are authorized.

**Exceptions:**

- Invalid credentials → error message displayed.  
- Inactive user → access denied.

---

### UC-02 — View Dashboard

**Actor:** Admin, Operations User  
**Description:** User views business KPIs, recent activity, cash/bank balances, and charts.

**Preconditions:** User is logged in.

**Main Flow:**

1. User navigates to Dashboard.  
2. System loads stats: bookings, revenue, expenses, fleet status.  
3. System shows cash and bank balances from real transactions.  
4. User reviews recent bookings and alerts.

**Postconditions:** Dashboard reflects current database state.

---

### UC-03 — Create Booking

**Actor:** Operations User  
**Description:** User creates a new transport booking for a customer trip.

**Preconditions:** Customer, route, and optional vehicle/driver data available.

**Main Flow:**

1. User opens **Booking → New Booking**.  
2. User enters customer, consignor, consignee, from/to cities, material, quantity.  
3. User enters freight amount and optional advance.  
4. User assigns vehicle and driver (optional).  
5. User saves the booking.  
6. System generates booking ID (e.g. BK-1043).  
7. System calculates balance = freight − advance.

**Postconditions:** Booking is stored; customer outstanding is updated.

---

### UC-04 — View / Edit Booking

**Actor:** Operations User  
**Description:** User views booking details or updates trip information.

**Preconditions:** Booking exists.

**Main Flow:**

1. User opens booking list and selects a booking.  
2. System displays booking summary and finance panel.  
3. User may click **Edit** to change route, freight, vehicle, or status.  
4. System saves changes and recalculates balance if freight/advance changed.

**Postconditions:** Booking record is updated.

---

### UC-05 — Record Booking Payment

**Actor:** Accounts / Operations User  
**Description:** User records a customer payment against a booking (cash, UPI, NEFT, cheque, etc.).

**Preconditions:** Booking exists with outstanding balance > 0.

**Main Flow:**

1. User opens **Booking Details → Finance → Record Payment**.  
2. User enters amount, payment mode, reference number, and remarks.  
3. System validates amount ≤ outstanding balance.  
4. System saves payment and recalculates booking balance and payment status (Paid / Partial / Unpaid).  
5. System updates customer outstanding.

**Postconditions:** Payment appears in Customer Ledger, Cash Flow, and Cash Book.

**Exceptions:**

- Payment exceeds balance → validation error.

---

### UC-06 — Add Broker Charge

**Actor:** Operations User  
**Description:** User records broker commission or loading charge linked to a booking.

**Preconditions:** Booking exists; broker name provided.

**Main Flow:**

1. User opens booking finance panel → **Broker Charges**.  
2. User enters broker name, charge type, amount, remarks.  
3. System creates or links broker master record.  
4. System updates broker outstanding report.

**Postconditions:** Broker charge stored; included in booking P&L and cash flow outflows.

---

### UC-07 — Add Booking Expense

**Actor:** Operations User  
**Description:** User records trip-level expense (Fuel, Toll, Hamali, Detention, Other).

**Preconditions:** Booking exists.

**Main Flow:**

1. User opens booking finance panel → **Additional Expenses**.  
2. User selects category, amount, vendor, description.  
3. System saves expense linked to booking.  
4. Expense appears in booking P&L, vehicle ledger, and cash flow.

**Postconditions:** Expense stored and reflected in reports.

---

### UC-08 — Generate RCM / FC Bill

**Actor:** Accounts User  
**Description:** User generates a transport tax bill (RCM or FC) including freight, other charges, advance, and balance due.

**Preconditions:** Booking exists with freight data.

**Main Flow:**

1. User opens booking finance panel → **RCM & FC Billing**.  
2. User clicks **Generate RCM Bill** or **Generate FC Bill**.  
3. System builds bill lines:  
   - Transport freight  
   - Booking expenses (Hamali, Toll, etc.)  
   - LR charges (loading, unloading, insurance) if LR linked  
4. System calculates:  
   - Taxable amount = freight + other charges  
   - GST: 5% (RCM) or 18% (FC)  
   - Advance = booking advance + all payments  
   - Balance due = gross total − advance  
5. System assigns bill number (e.g. FC-2026-0001).  
6. User may **Print** the bill.

**Postconditions:** Bill stored; printable document shows line items, advance credit, and balance due.

---

### UC-09 — Delete Transport Bill

**Actor:** Accounts User  
**Description:** User removes an incorrectly generated RCM or FC bill.

**Preconditions:** Bill exists for the booking.

**Main Flow:**

1. User opens booking finance panel → bill list.  
2. User clicks **Delete** on a bill.  
3. System asks for confirmation.  
4. System deletes the bill record.

**Postconditions:** Bill removed; no impact on booking balance or payments.

---

### UC-10 — Generate LR from Booking

**Actor:** Operations User  
**Description:** User creates a Lorry Receipt prefilled from booking finance data.

**Preconditions:** Booking exists.

**Main Flow:**

1. User opens **Booking Details** and clicks **Generate LR**.  
2. System prefills: consignor, consignee, route, vehicle, driver, freight, GST.  
3. System carries forward:  
   - Advance = booking advance + payments  
   - Hamali, loading, unloading, insurance from expenses/LR rules  
   - Broker and expense notes in remarks  
4. User reviews and saves LR.  
5. System generates LR number and calculates LR balance.

**Postconditions:** LR linked to booking; GST report may show LR GST.

---

### UC-11 — Create / Edit / Delete LR

**Actor:** Operations User  
**Description:** User manages LR records independently or from booking.

**Preconditions:** User has LR module access.

**Main Flow:**

1. User opens **LR Management → Generate LR** or LR list.  
2. User creates, edits, prints, or deletes an LR.  
3. System maintains freight, charges, advance, and balance on LR.

**Postconditions:** LR data available for trip reports and vehicle ledger.

---

### UC-12 — Manage Vehicles

**Actor:** Operations User  
**Description:** User maintains fleet master data and views maintenance profile.

**Main Flow:**

1. User opens **Vehicles** list.  
2. User adds vehicle number, type, capacity, compliance dates.  
3. User views vehicle details and maintenance history.

**Postconditions:** Vehicle available for booking and LR assignment.

---

### UC-13 — Manage Drivers

**Actor:** Operations User  
**Description:** User maintains driver records, salary, and trip assignment data.

**Main Flow:**

1. User opens **Drivers** list.  
2. User adds/edits driver name, phone, license, salary.  
3. User assigns driver to bookings and LRs.

**Postconditions:** Driver available for operations and driver ledger.

---

### UC-14 — Manage Customers

**Actor:** Operations User  
**Description:** User maintains customer master and views outstanding balance.

**Main Flow:**

1. User opens **Customers** list.  
2. User adds customer name, contact, GST, credit limit.  
3. System shows outstanding from booking balances.

**Postconditions:** Customer selectable on new bookings.

---

### UC-15 — Manage Vendors

**Actor:** Operations User  
**Description:** User maintains vendor master for expenses and payables.

**Main Flow:**

1. User opens **Vendors** list.  
2. User adds vendor name, category, contact.  
3. System tracks vendor outstanding from linked expenses.

**Postconditions:** Vendor available for expense entry.

---

### UC-16 — Record Global Expense

**Actor:** Accounts User  
**Description:** User records company expense not tied to a specific booking (fuel, maintenance, etc.).

**Main Flow:**

1. User opens **Expenses → New Expense**.  
2. User enters date, category, amount, vehicle, vendor, payment mode.  
3. System saves expense.

**Postconditions:** Expense appears in P&L, cash flow, and vehicle ledger (if vehicle linked).

---

### UC-17 — Customer Ledger Report

**Actor:** Accounts User  
**Description:** User views customer-wise debit/credit running balance.

**Main Flow:**

1. User opens **Accounting → Customer Ledger Report**.  
2. User filters by customer and date range.  
3. System shows: Date, Voucher, Particular, Ref No, Debit, Credit, Balance.  
4. Freight lines appear before payment lines on the same date.

**Postconditions:** User verifies customer receivable (e.g. ₹32,000 for BK-1043).

---

### UC-18 — Vendor / Driver / Vehicle Ledger Reports

**Actor:** Accounts User  
**Description:** User views party-wise or asset-wise ledger summaries.

**Main Flow:**

1. User opens respective ledger report under Accounting.  
2. **Vehicle Ledger** shows trip income, fuel, maintenance, booking expenses, broker charges, net profit.  
3. User exports or prints if needed.

**Postconditions:** User analyzes profitability per vehicle or party.

---

### UC-19 — Outstanding Report

**Actor:** Accounts User  
**Description:** User views customers, vendors, and parties with pending amounts.

**Main Flow:**

1. User opens **Accounting → Outstanding Report**.  
2. User applies date and customer/vendor filters.  
3. System lists customer outstanding from booking balances and vendor/broker payables.

**Postconditions:** User identifies collection and payment priorities.

---

### UC-20 — Cash Flow Report

**Actor:** Accounts User  
**Description:** User views monthly cash inflows and outflows with drill-down detail.

**Main Flow:**

1. User opens **Reports → Cash Flow Report**.  
2. System shows monthly inflow, outflow, and net.  
3. User clicks **View entries** for a month.  
4. System shows line items: payments, advances, expenses, broker charges with ref no and mode.

**Postconditions:** User reconciles cash movement.

---

### UC-21 — Profit & Loss / Trial Balance / Balance Sheet

**Actor:** Accounts User  
**Description:** User views financial position and period performance.

**Main Flow:**

1. User opens respective report under Accounting.  
2. **P&L:** Freight income vs operating expenses.  
3. **Trial Balance:** Cash, bank, receivable, payables.  
4. **Balance Sheet:** Assets, liabilities, equity snapshot.

**Postconditions:** Management reviews financial health.

---

### UC-22 — GST Report

**Actor:** Accounts User  
**Description:** User views output GST from LRs and bills.

**Preconditions:** At least one LR or bill with GST exists.

**Main Flow:**

1. User opens **Accounting → GST Reports**.  
2. System shows output GST and monthly breakdown from LR records.

**Postconditions:** User supports GST filing preparation.

---

### UC-23 — Voucher Entry

**Actor:** Accounts User  
**Description:** User posts accounting vouchers (Receipt, Payment, Journal).

**Main Flow:**

1. User opens **Accounting → Voucher Entry**.  
2. User selects voucher type, date, party, amount, narration.  
3. System saves voucher and reflects in registers and cash/bank books.

**Postconditions:** Manual accounting entries recorded.

---

### UC-24 — Booking P&L & Broker Outstanding Reports

**Actor:** Accounts User  
**Description:** User analyzes per-booking profit and broker payables.

**Main Flow:**

1. User opens **Reports → Booking P&L** or **Broker Outstanding**.  
2. System shows income, costs, margin per booking or broker payable totals.  
3. User exports or prints.

**Postconditions:** Trip-level profitability is visible.

---

### UC-25 — Process Payroll

**Actor:** HR / Payroll User  
**Description:** User runs payroll for employees/drivers linked to HR module.

**Main Flow:**

1. User opens **Payroll → Process Payroll**.  
2. User selects period and employees.  
3. System calculates salary, deductions, net pay.  
4. User generates payslips and salary register.

**Postconditions:** Payroll run stored; payslips available.

---

### UC-26 — HR Employee & Attendance Management

**Actor:** HR User  
**Description:** User manages employees, departments, attendance, leave, and holidays.

**Main Flow:**

1. User opens **HR** hub.  
2. User maintains employee records, marks attendance, approves leave.  
3. System enforces TMS transport HR norms where configured.

**Postconditions:** HR data supports payroll and compliance.

---

### UC-27 — GPS Fleet Tracking

**Actor:** Operations User  
**Description:** User tracks live fleet, geofences, and vehicle history.

**Main Flow:**

1. User opens **Operations → GPS / Fleet Map**.  
2. System displays vehicle positions and geofence alerts.  
3. User views route history for a vehicle.

**Postconditions:** Operational visibility of fleet movement.

---

### UC-28 — Customer Portal Track Shipment

**Actor:** Customer (Portal User)  
**Description:** Customer logs in to track booking/shipment and view invoices.

**Main Flow:**

1. Customer opens portal login.  
2. Customer views dashboard and tracks shipment by booking ID.  
3. Customer views invoice list and details.

**Postconditions:** Customer self-service without calling operations desk.

---

### UC-29 — System Settings

**Actor:** Super Admin  
**Description:** Admin configures branches, portal users, notifications, and company profile.

**Main Flow:**

1. User opens **Settings**.  
2. User manages branches, users, notification channels, company details for printing.  
3. System applies settings across modules.

**Postconditions:** Multi-branch and branding configuration updated.

---

## 6. Non-Functional Requirements (Summary)

| Requirement | Description |
|-------------|-------------|
| Security | JWT authentication; role-based API authorization |
| Data integrity | Booking balance recalculated on every payment |
| Audit | Created/updated timestamps on core entities |
| Reporting | Filter by date, customer, vendor, branch |
| Export | CSV export and print on list/report pages |
| Multi-branch | Branch-scoped data where configured |

---

## 7. Glossary

| Term | Meaning |
|------|---------|
| **Booking** | Transport order before or without formal LR |
| **LR** | Lorry Receipt — legal/consignment document for a trip |
| **RCM** | Reverse Charge Mechanism GST invoice |
| **FC** | Freight Collection bill with GST |
| **Advance** | Amount received from customer before trip completion |
| **Outstanding** | Amount still due from customer on freight |
| **Broker charge** | Commission or fee payable to transport broker |
| **Provision** | Accounting accrual for party or vendor liability |

---

## 8. Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Prepared by | TMS Pro Team | | |
| Reviewed by | | | |
| Approved by | | | |

---

*End of Document*
