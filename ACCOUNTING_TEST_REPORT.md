# ACCOUNTING_TEST_REPORT

**System:** TMS Pro (hybrid ops registers + double-entry GL)  
**Date:** 2026-09-30  
**Environment:** Local API `http://localhost:5000`, PostgreSQL `tms_pro`, company **Demo Company** (`00000000-0000-4000-8000-000000000001`) and empty **DEMO** company for CRUD smoke.

## Scope & method

| Method | Executed? | Evidence |
| ------ | --------- | -------- |
| Backend unit/integration tests | **Yes** | `dotnet test` → **224/224 passed** (includes `AccountingPostingEngineTests`, `TdsCalculationServiceTests`) |
| Frontend GST calc unit tests | **Yes** | `billingInvoiceUtils.test.js` → **7/7 passed** |
| Live API smoke (auth + GL/TDS/GST endpoints) | **Yes** | `scripts/smoke-api-audit.mjs` → **43/43 passed** |
| Live GL integrity probe | **Yes** | `scripts/smoke-gl-integrity.mjs` on Demo Company |
| FY migration / reconciliation POST | **Attempted** | Script prepared; later blocked by **C: disk full (ENOSPC)** |
| UI page testing (Accounting screens) | **NOT EXECUTED – ENVIRONMENT DEPENDENCY** | Vite failed (`ENOSPC` on C:) |
| CA sign-off / GSTN / NIC filing | **Out of scope** | Documented in `docs/ACCOUNTING_TRANSACTION_COVERAGE.md` |
| Schema/API/UI inventory (read-only) | **Yes** | Merged from [Audit accounting schema UI](23d9a9a2-975d-4662-af3b-5cf4984f5a13) |

## Executive accounting findings

1. **Double-entry engine enforces Debit = Credit** (unit-tested; unbalanced journal API returns HTTP 400 with clear message).
2. **AutoPostOps = true** and **GlReportsEnabled = true** on Demo Company, but **ops freight invoices are not reflected in GL trial balance** (High).
3. **Empty `catch` on invoice GL post** previously swallowed posting failures — **fixed** to `LogWarning` in `FreightInvoicesController`.
4. Outstanding / invoice registers can show AR while GL TB is zero → **hybrid mode risk** if users trust GL TB as source of truth without running migration/recon.
5. TDS calculation rules (PAN, threshold, exemption, rounding) are unit-tested and live TDS settings/sections/rates APIs respond.
6. GSTR-1 / GSTR-3B / Form 26Q compliance endpoints respond (register/export style — not live GSTN filing).
7. **Chart of Accounts vs Ledger Master dual balance modes** (same `ledger_accounts` table): CoA always uses ops live balances; Ledger Master uses GL voucher balances when `gl_reports_enabled`, else ops live — can disagree with each other and with Outstanding.
8. **Bank reconciliation is header-only** (POST create; no statement line import/match UI; `bank_reconciliation_lines` unused in API) — not Tally-equivalent BRS.

---

## Schema / API / UI inventory (code audit)

PostgreSQL accounting objects are largely `CREATE OR REPLACE FUNCTION` (not SQL Server SPs). Write-side GL posting is C# (`AccountingPostingEngine` / `GlOpsPostingService`).

| Layer | Key locations |
| ----- | ------------- |
| SQL GL | `database/accounting/gl_schema.sql`, `database/schema.sql`, `database/seed_accounting.sql` |
| SQL TDS / commercial / booking finance | `database/tds/schema.sql`, `database/commercial/schema.sql`, `database/booking_finance/schema.sql` |
| Report functions | `database/reports/sp_accounting_*.sql`, payroll `database/payroll/payroll_accounting_sp.sql` |
| APIs | `api/accounting`, `api/gl`, `api/tds`, booking-finance, `api/freight-invoices` |
| UI | 40 pages under `src/pages/accounting/` (hub `src/config/accountingHub.js`) |

**Core GL tables:** `ledger_accounts`, `vouchers`, `voucher_lines`, `account_groups`, `financial_years`, `accounting_periods`, `accounting_settings`, `account_posting_maps`, `vendor_bills*`, `credit_debit_notes`, `bank_accounts`, `bank_reconciliations`, `bank_reconciliation_lines`, `accounting_audit_log`, `accounting_reconciliation_findings`, `e_invoice_register`.

**Tally-gap confirmation (docs + code):** fuel/maintenance → GL N/A; payroll → GL PARTIAL; no GSTN/NIC/TRACES live filing; no Tally export connector; bank recon incomplete.

---

## Chart of Accounts / Ledger Master

| Test | Result | Notes |
| ---- | ------ | ----- |
| List ledger master | **PASS (API)** | DEMO company: 19 ledgers; Demo Company TB lists 24 active ledgers |
| Chart of accounts groups | **PASS (API)** | Groups include Current Assets, Duties & Taxes, Liabilities, Capital, Income, Expenses |
| Same underlying table | **CODE_REVIEW** | Both use `ledger_accounts`; CoA grouped read-only; LM paginated + create |
| Balance source CoA | **CODE_REVIEW** | Always **ops live** balances (`BuildLiveAccountBalancesAsync`) |
| Balance source Ledger Master | **CODE_REVIEW** | **GL** when `gl_reports_enabled`, else ops live |
| Create/edit/deactivate CoA via UI | **NOT EXECUTED – ENV** | UI blocked |
| Duplicate account code | **NOT EXECUTED – ENV** | Needs write UI/API negative case beyond smoke |
| Opening balance | **CODE_REVIEW** | `GlReportService` includes `OpeningBalance` in TB |

## Bank reconciliation

| Test | Result | Notes |
| ---- | ------ | ----- |
| UI page exists | **CODE_REVIEW** | `GlBankReconPage.jsx` |
| Bank accounts API | **CODE_REVIEW** | `GET/POST /api/gl/bank-accounts` |
| Create recon header | **CODE_REVIEW** | `POST /api/gl/bank-reconciliations` (statement vs book, Status=`OPEN`) |
| Statement line import / match / unmatch | **Missing** | No API write of `bank_reconciliation_lines`; no close/complete GET history |
| Completeness vs Tally BRS | **FAIL (product gap)** | Header-only — track as ACC-006 |

## Double-entry / Journal

| Test | Result | Notes |
| ---- | ------ | ----- |
| Balanced lines accepted (engine) | **PASS** | `AccountingPostingEngineTests` |
| Unbalanced rejected (engine) | **PASS** | Same |
| Unbalanced journal API | **PASS** | `POST /api/gl/journals` → 400 `Unbalanced voucher: Debit 100 != Credit 50.` |
| Invoice+GST balance | **PASS** | Unit test 1180=1180 |
| Vendor payment+TDS balance | **PASS** | Unit test |
| Receipt+TDS receivable balance | **PASS** | Unit test |
| Voucher Entry UI ledger-by-id | **CODE_REVIEW** | Updated to send `debitLedgerId`/`creditLedgerId`; backend resolves IDs |

## TMS → Accounting integration (live Demo Company)

| TMS artefact | Observed | GL impact observed | Status |
| ------------ | -------- | ------------------ | ------ |
| Freight invoices (2) | Totals 23600 open + 4500 paid | **No** `CUSTOMER_INVOICE` vouchers with `sourceType` | **FAIL / High** |
| Vendor payment voucher `VP-2026-0001` | POSTED, amount 100000, TDS narrative | Listed in `/api/gl/vouchers` but **TB totals still 0** (lines may lack `LedgerAccountId` or not in FY query) | **FAIL / High** |
| Outstanding report | Customers outstanding total **56769.8** | Ops-facing register | **PASS (API)** but **does not match GL TB** |
| Trial balance | source=`GL`, Dr=0, Cr=0, balanced | Empty movements vs ledgers | **PASS shape / FAIL integrity vs ops** |
| GL settings | `autoPostOps=true`, `glReportsEnabled=true` | Config OK | **PASS** |
| Posting maps | 14 maps | Present | **PASS** |

**Root cause hypotheses (code-backed):**

1. Invoice create calls `TryPostCustomerInvoiceAsync` inside try/catch that previously **swallowed exceptions** (`CommercialControllers.cs`) — posting may have failed silently for existing invoices.
2. Historical invoices may predate auto-post; backfill is via `POST /api/gl/migration/run` (`AccountingMigrationService`) — not confirmed completed this session after disk failure.
3. `GlReportService.TrialBalanceAsync` aggregates only `VoucherLines` with `LedgerAccountId` on **POSTED** vouchers — name-only legacy lines would not move TB.

**Fix applied this session:**

- `FreightInvoicesController`: log GL auto-post failures with invoice id/number (`ILogger`) instead of empty catch.

**Recommended next actions (manual / CA):**

1. Free C: disk; restart API; run **Accounting → GL Controls → Run FY Backfill** and **Ops↔GL Reconciliation**.
2. Inspect `VP-2026-0001` voucher lines for null `ledger_account_id`.
3. Re-issue or migrate open freight invoices until TB AR matches outstanding.

## GST

| Test | Result | Notes |
| ---- | ------ | ----- |
| FC 18% CGST/SGST split | **PASS** | `billingInvoiceUtils.test.js` |
| Interstate IGST | **PASS** | Same |
| RCM 5% taxable-only payable | **PASS** | Same |
| Grand = taxable+gst+roundOff−advance | **PASS** | Same |
| Live `/api/accounting/gst` | **PASS** | Returns input/output/net |
| Live GSTR-1 / GSTR-3B | **PASS (API shape)** | Empty/register data; not GSTN upload |
| Company GSTIN null on Demo/DEMO | **Observation** | Compliance note fields present; filing identity incomplete |
| UI GST reports page | **NOT EXECUTED – ENV** | |

## TDS

| Test | Result | Notes |
| ---- | ------ | ----- |
| Rate with PAN / without PAN | **PASS** | `TdsCalculationServiceTests` |
| Threshold / exemption / rounding | **PASS** | Same |
| Live settings/sections/rates/transactions | **PASS** | 4 sections, 4 rates |
| Form 26Q JSON | **PASS (API)** | Export endpoint responds |
| Vendor payment UI + GL | **Partial** | Voucher exists; TB not updated (see integrity) |
| UI TDS pages | **NOT EXECUTED – ENV** | |

## Billing / Receipt / Payment / Expense (accounting view)

| Area | Automated / API | UI | Notes |
| ---- | --------------- | -- | ----- |
| Freight invoice list | PASS | NOT EXECUTED – ENV | Demo Company has 2 invoices |
| Customer receipt allocation | CODE_REVIEW + unit balance | NOT EXECUTED – ENV | Engine supports TDS receivable lines |
| Vendor bill / payment | CODE_REVIEW + unit | Partial live voucher | Integrity gap |
| Company expense categories API | PASS | NOT EXECUTED – ENV | Categories list OK |
| Expense CRUD accounting entry | CODE_REVIEW (`GlOpsPostingService`) | NOT EXECUTED – ENV | |

## Accounting integrity rules checklist

| Rule | Status |
| ---- | ------ |
| 1. Debit total = Credit total (engine + unbalanced reject) | **PASS** (engine/API) |
| 2. Invoice total formula (client calc) | **PASS** (unit) |
| 3. Receipt reduces outstanding | **NOT EXECUTED – ENV** (no receipt create in live smoke) |
| 4. Payment reduces payable | **PARTIAL** — payment voucher present; GL TB not reflecting |
| 5. Cancelled txns out of active balances | **CODE_REVIEW** (cancel API zeros balance); GL reverse not UI-tested |
| 6. No duplicate accounting entries | **CODE_REVIEW** (`FindBySourceAsync` idempotency) |
| 7. Edit after accounting | **NOT EXECUTED – ENV** |
| 8. Cancel policy | **CODE_REVIEW** |
| 9. Ledger balances reconcile to txns | **FAIL (Demo Company live)** — TB 0 vs ops AR |
| 10. Reports reconcile to ledgers | **FAIL until #9 fixed** |

## Accounting test summary table

| Area | Tests | Passed | Failed | Fixed | Status |
| ---- | ----: | -----: | -----: | ----: | ------ |
| Engine / TDS / GST unit | 20+ | all | 0 | 0 | PASS |
| Live GL/TDS/GST API smoke | 20 | 20 | 0 | 0 | PASS (endpoint health) |
| Ops↔GL integrity (Demo Co) | 6 | 3 | 3 | 1 (logging) | **FAIL High remaining** |
| UI accounting pages | — | — | — | — | NOT EXECUTED – ENV |
| Migration/backfill | 1 | 0 | 0 | 0 | NOT EXECUTED – ENV (disk) |

## Remaining accounting issues

| ID | Severity | Issue | Recommendation |
| -- | -------- | ----- | -------------- |
| ACC-001 | **High** | Open freight invoices / outstanding not in GL TB despite AutoPostOps | Run migration+recon; verify post maps; retest TB vs outstanding |
| ACC-002 | **High** | Posted payment voucher with null `sourceType`; TB still zero | Inspect voucher lines / ledger IDs; fix posting path for vendor payments |
| ACC-003 | **Medium** | Multiple empty catches around GL post in other controllers | Same logging pattern as freight invoices |
| ACC-004 | **Low** | Company GSTIN null | Master data for compliance exports |
| ACC-005 | Info | Hybrid ops reports vs GL reports; CoA always ops-live vs LM optionally GL | Document for users; consider aligning CoA to same flag |
| ACC-006 | **Medium** | Bank recon header-only (no line matching) | Product gap vs Tally BRS — implement lines API+UI or mark unsupported |
| ACC-007 | Info | Payroll→GL PARTIAL; fuel/maintenance N/A; no Tally export | Confirm with client whether in scope |

## CA / client confirmation required

- Whether GL TB is the statutory book of record (vs ops outstanding) once `gl_reports_enabled=true`.
- Treatment of historical invoices created before auto-post.
- Live GSTN / NIC / TRACES filing (explicitly out of product scope today).
- Whether CoA and Ledger Master may show different balances by design.
- Whether bank reconciliation line matching is required before go-live.
