-- Double-entry GL extensions (idempotent)

CREATE TABLE IF NOT EXISTS account_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    account_type    VARCHAR(50) NOT NULL,
    parent_id       UUID REFERENCES account_groups(id),
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS financial_years (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    code            VARCHAR(20) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS accounting_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
    period_no       INT NOT NULL,
    name            VARCHAR(50) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, financial_year_id, period_no)
);

CREATE TABLE IF NOT EXISTS cost_centres (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS accounting_settings (
    company_id              UUID PRIMARY KEY,
    gl_reports_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval        BOOLEAN NOT NULL DEFAULT FALSE,
    auto_post_ops           BOOLEAN NOT NULL DEFAULT TRUE,
    default_cash_ledger_id  UUID,
    default_bank_ledger_id  UUID,
    ar_control_ledger_id    UUID,
    ap_control_ledger_id    UUID,
    freight_income_ledger_id UUID,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES account_groups(id);
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS is_control BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS party_type VARCHAR(30);
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS party_id VARCHAR(50);
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS branch_id UUID;

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS financial_year_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS period_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'POSTED';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS posting_date DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS cost_centre_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS source_id VARCHAR(80);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reversed_by_voucher_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reversal_of_voucher_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE vouchers SET transaction_date = voucher_date WHERE transaction_date IS NULL;
UPDATE vouchers SET posting_date = voucher_date WHERE posting_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vouchers_source
    ON vouchers (company_id, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND status = 'POSTED';

ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS cost_centre_id UUID;
ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS party_type VARCHAR(30);
ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS party_id VARCHAR(50);
ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS line_no INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS account_posting_maps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    txn_type            VARCHAR(50) NOT NULL,
    debit_ledger_id     UUID,
    credit_ledger_id    UUID,
    tax_ledger_id       UUID,
    tds_ledger_id       UUID,
    secondary_ledger_id UUID,
    extras_json         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, txn_type)
);

CREATE TABLE IF NOT EXISTS vendor_bills (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    branch_id           UUID,
    bill_no             VARCHAR(50) NOT NULL,
    bill_date           DATE NOT NULL,
    vendor_id           VARCHAR(50) NOT NULL,
    vendor_name         VARCHAR(200),
    taxable_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    cgst_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
    sgst_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
    igst_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
    tds_amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(14,2) NOT NULL DEFAULT 0,
    amount_paid         DECIMAL(14,2) NOT NULL DEFAULT 0,
    balance             DECIMAL(14,2) NOT NULL DEFAULT 0,
    expense_account_id  UUID,
    cost_centre_id      UUID,
    reference_no        VARCHAR(100),
    narration           TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'POSTED',
    accounting_voucher_id UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    UNIQUE (company_id, bill_no)
);

CREATE TABLE IF NOT EXISTS vendor_bill_lines (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    vendor_bill_id      UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
    line_no             INT NOT NULL DEFAULT 1,
    description         VARCHAR(500),
    ledger_account_id   UUID,
    amount              DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vendor_bill_settlements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    vendor_bill_id      UUID NOT NULL REFERENCES vendor_bills(id),
    vendor_payment_id   UUID,
    amount              DECIMAL(14,2) NOT NULL,
    settlement_date     DATE NOT NULL,
    accounting_voucher_id UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_debit_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    branch_id           UUID,
    note_no             VARCHAR(50) NOT NULL,
    note_date           DATE NOT NULL,
    note_type           VARCHAR(20) NOT NULL,
    party_type          VARCHAR(20) NOT NULL,
    party_id            VARCHAR(50) NOT NULL,
    party_name          VARCHAR(200),
    invoice_id          UUID,
    vendor_bill_id      UUID,
    taxable_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(14,2) NOT NULL DEFAULT 0,
    narration           TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'POSTED',
    accounting_voucher_id UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    UNIQUE (company_id, note_no)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    ledger_account_id   UUID NOT NULL,
    bank_name           VARCHAR(200) NOT NULL,
    account_no          VARCHAR(50),
    ifsc                VARCHAR(20),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, ledger_account_id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    bank_account_id     UUID NOT NULL REFERENCES bank_accounts(id),
    statement_date      DATE NOT NULL,
    statement_balance   DECIMAL(14,2) NOT NULL DEFAULT 0,
    book_balance        DECIMAL(14,2) NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_lines (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    bank_reconciliation_id  UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
    voucher_line_id         UUID,
    statement_ref           VARCHAR(100),
    amount                  DECIMAL(14,2) NOT NULL DEFAULT 0,
    is_matched              BOOLEAN NOT NULL DEFAULT FALSE,
    matched_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS accounting_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(80) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    details         TEXT,
    user_name       VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_reconciliation_findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    finding_type    VARCHAR(50) NOT NULL,
    source_type     VARCHAR(50),
    source_id       VARCHAR(80),
    voucher_id      UUID,
    amount_ops      DECIMAL(14,2),
    amount_gl       DECIMAL(14,2),
    message         TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS e_invoice_register (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    freight_invoice_id  UUID NOT NULL,
    invoice_no          VARCHAR(50) NOT NULL,
    invoice_date        DATE NOT NULL,
    customer_name       VARCHAR(200),
    gstin               VARCHAR(20),
    taxable_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(14,2) NOT NULL DEFAULT 0,
    irn                 VARCHAR(100),
    ack_no              VARCHAR(50),
    ack_date            DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'READY',
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_e_invoice_freight ON e_invoice_register(company_id, freight_invoice_id);
CREATE INDEX IF NOT EXISTS idx_e_invoice_company_date ON e_invoice_register(company_id, invoice_date);

CREATE INDEX IF NOT EXISTS idx_vouchers_company_status_date ON vouchers(company_id, status, voucher_date);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_ledger ON voucher_lines(ledger_account_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor ON vendor_bills(company_id, vendor_id, bill_date);
CREATE INDEX IF NOT EXISTS idx_cdn_party ON credit_debit_notes(company_id, party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_acct_audit_entity ON accounting_audit_log(company_id, entity_type, entity_id);
