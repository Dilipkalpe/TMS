# TDS Module

Configurable Tax Deducted at Source for TMS Accounting. Aligns with the existing ops-driven voucher model (ledger names on voucher lines; outstanding from bookings/invoices).

## Architecture

| Concern | Behaviour |
|---------|-----------|
| Masters | Sections, rates, exemptions, settings (company-scoped) |
| TDS Payable | Deducted on **Vendor Payment** (`/accounting/tds/vendor-payment`) |
| TDS Receivable | Captured when customer deducts TDS on receipt (Outstanding / Payment Adjustment / booking payments) |
| Persistence | `tds_transactions` + optional companion vouchers |
| Reversal | Opposite TDS row + reversing voucher; originals stay as `REVERSED` |
| Out of scope | TRACES / Form 26Q filing; auto-TDS on expense save; mutating `ledger_accounts.balance` |

## Screens

| Screen | Route |
|--------|-------|
| TDS Settings | `/accounting/tds/settings` |
| TDS Section Master | `/accounting/tds/sections` |
| TDS Rate Master | `/accounting/tds/rates` |
| TDS Exemptions | `/accounting/tds/exemptions` |
| Vendor Payment | `/accounting/tds/vendor-payment` |
| TDS Transactions | `/accounting/tds/transactions` |
| TDS Reports | `/accounting/tds/reports` |

Vendor and Customer masters include **PAN**, **TDS Applicable**, and **Default TDS Section**.

## Calculation rules

1. Resolve section (party default or selected).
2. Apply active rate for payment date (`rate_percent`; without PAN → `rate_without_pan_percent`).
3. Valid exemption / lower-rate certificate overrides rate (null lower rate = full exemption).
4. `TRANSACTION` threshold: base below threshold → TDS = 0.
5. Rounding per `tds_settings.round_off` (`NEAREST` / `UP` / `DOWN` / `NONE`).
6. Net = Gross − TDS.

Preview: `POST /api/tds/calculate`.

## Accounting entries

Ledger names come from TDS Settings (defaults: **TDS Payable**, **TDS Receivable**). CoA rows are ensured on migrate.

**Vendor payment with TDS**

- Debit Vendor / AP = Gross  
- Credit Bank / Cash = Net  
- Credit TDS Payable = TDS  

**Customer receipt with customer-deducted TDS**

- Debit Bank / Cash = Net (cash received)  
- Debit TDS Receivable = TDS  
- Credit Customer / Freight = Gross  

`booking_payments` stores `amount` (cash), `gross_amount`, `tds_amount`, `tds_section_id`.

## API (`/api/tds`)

- Settings, sections, rates, exemptions CRUD  
- `POST /calculate`  
- `POST|GET /vendor-payments`  
- `GET /transactions`, `POST /transactions/{id}/reverse`  
- Reports: `/reports/details`, `/reports/vendor-wise`, `/reports/summary`  

Customer receipt TDS fields are also accepted on:

- `POST /api/bookings/{id}/payments`  
- `POST /api/accounting/outstanding/customer-payment`  

## Seed data

On first migrate per company (`TdsSchemaMigrator`):

- Settings enabled with auto voucher post  
- Sections **194C**, **194J**, **194H**, **194I** with starter rates (editable)  
- Ledger accounts **TDS Payable** / **TDS Receivable** if missing  

## Reports

Filters: FY, date range, party, section, direction, status.  
Export: CSV from list tables; PDF via browser print on the reports screen.
