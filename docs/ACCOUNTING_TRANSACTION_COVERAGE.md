# Accounting Transaction Coverage Report

**System:** TMS Pro double-entry GL (`AccountingPostingEngine`)  
**Updated:** 30 September 2026  

## Status legend

| Status | Meaning |
|--------|---------|
| **AUTO** | Ops save calls `GlOpsPostingService` → balanced POSTED voucher |
| **MANUAL** | User posts via GL Journal / Voucher UI |
| **PARTIAL** | Document exists; GL posting incomplete or optional |
| **PENDING** | Not implemented in product |
| **N/A** | No accounting impact |

## Coverage matrix

| TMS transaction | Source table | GL source_type | Status | Notes |
|-----------------|--------------|----------------|--------|-------|
| Freight invoice create | `freight_invoices` | `CUSTOMER_INVOICE` | **AUTO** | AR Dr / Freight + Output GST Cr |
| Customer receipt (booking/outstanding/LR) | `booking_payments` | `CUSTOMER_RECEIPT` | **AUTO** | Bank/Cash + TDS Receivable Dr / AR Cr |
| Company expense | `expenses` | `EXPENSE_CASH` / `EXPENSE_CREDIT` | **AUTO** | Expense Dr / Cash-Bank or AP Cr |
| Booking expense | `booking_expenses` | `BOOKING_EXPENSE` | **AUTO** | Expense Dr / AP or Cash Cr |
| LR / trip expense (on approve) | `lr_expenses` | `LR_EXPENSE` | **AUTO** | Posts when status → Approved |
| Vendor bill | `vendor_bills` | `VENDOR_BILL` | **AUTO** | Expense + Input GST Dr / AP (+ TDS) Cr |
| Vendor payment (TDS module) | `vendor_payments` | `VENDOR_PAYMENT` | **AUTO** | AP Dr / Bank + TDS Payable Cr |
| TDS receivable register | `tds_transactions` | (via receipt) | **AUTO** | Tracked in TDS module; voucher via receipt GL |
| TDS payable register | `tds_transactions` | (via vendor payment) | **AUTO** | Same |
| Credit note | `credit_debit_notes` | `CREDIT_NOTE` | **AUTO** | UI `/accounting/gl/credit-debit-notes` |
| Debit note | `credit_debit_notes` | `DEBIT_NOTE` | **AUTO** | Same |
| Journal / Contra | `vouchers` | `JOURNAL` / manual | **MANUAL** | GL Journal UI; Dr=Cr enforced |
| Opening balance | `vouchers` | `OPENING_BALANCE` | **AUTO** | Created by FY migration job |
| Provisions | `provisions` | `PROVISION` | **AUTO** | Expense Dr / AP Cr on create |
| Broker charges | `booking_broker_charges` | `BROKER_CHARGE` | **AUTO** | Commission expense / AP |
| Booking advance at create | `bookings` | `ADVANCE_RECEIVED` | **AUTO** | When Advance > 0 on booking create |
| Fuel / maintenance cost | `fuel_entries` / `maintenance_records` | — | **N/A** / ops analytics |
| Payroll pay | payroll tables | — | **PARTIAL** | Legacy payroll SP may post separately |
| GSTR-1 register | freight invoices | — | **AUTO** | `/accounting/gl/compliance` + `GET /api/gl/compliance/gstr1` |
| GSTR-3B worksheet | invoices + vendor bills + GL tax | — | **AUTO** | `GET /api/gl/compliance/gstr3b` |
| E-Invoice register | `e_invoice_register` | — | **AUTO** | Local IRN/Ack entry — not NIC API |
| Form 26Q / TDS export | `tds_transactions` | — | **AUTO** | JSON + CSV `GET /api/gl/compliance/form26q.csv` |

## Proof chain (tests)

Unit tests in `AccountingPostingEngineTests` prove:

1. Unbalanced vouchers are rejected (`Debit != Credit`).
2. Invoice + GST lines balance.
3. Vendor payment + TDS lines balance.
4. Customer receipt + TDS receivable lines balance.

Runtime chain after migration (`POST /api/gl/migration/run`):

`Ops txn → PostingEngine → POSTED voucher → ledger running balance → Trial Balance / P&L / BS`  
(when `accounting_settings.gl_reports_enabled = true`).

## How to enable

1. Restart API (runs `AccountingGlSchemaMigrator` — FY, CoA groups, posting maps, e-invoice table).
2. Open **Accounting → GL Controls → Run FY Backfill**.
3. Ensure **GL Reports Enabled = Yes** and **Auto-post Ops = Yes**.
4. Open **Accounting → GST / TDS Compliance** for GSTR-1 / 3B / 26Q / e-Invoice.
5. Run **Ops↔GL Reconciliation** and clear findings.

## Explicitly out of scope

- Live GSTN portal filing (GSTR upload API)
- NIC e-Invoice IRN generation API
- TRACES e-filing submission (CSV/register only)
