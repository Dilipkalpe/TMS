-- TDS (Tax Deducted at Source) module — PostgreSQL
-- Configurable sections/rates; vendor payments (payable) + customer receipt TDS (receivable).

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_tds_section_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_tds_section_id UUID;

ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS tds_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS tds_section_id UUID;
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(14,2);

CREATE TABLE IF NOT EXISTS tds_sections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID NOT NULL,
    section_code      VARCHAR(20) NOT NULL,
    name              VARCHAR(200) NOT NULL,
    nature_of_payment VARCHAR(200),
    party_type        VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(100),
    updated_by        VARCHAR(100),
    UNIQUE (company_id, section_code)
);

CREATE TABLE IF NOT EXISTS tds_rates (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                UUID NOT NULL,
    section_id                UUID NOT NULL REFERENCES tds_sections(id) ON DELETE CASCADE,
    rate_percent              DECIMAL(8,4) NOT NULL DEFAULT 0,
    rate_without_pan_percent  DECIMAL(8,4) NOT NULL DEFAULT 20,
    threshold_amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    threshold_type            VARCHAR(20) NOT NULL DEFAULT 'TRANSACTION',
    effective_from            DATE NOT NULL,
    effective_to              DATE,
    is_active                 BOOLEAN NOT NULL DEFAULT true,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                VARCHAR(100),
    updated_by                VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tds_exemptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    party_type          VARCHAR(20) NOT NULL,
    party_id            VARCHAR(40) NOT NULL,
    section_id          UUID REFERENCES tds_sections(id) ON DELETE SET NULL,
    certificate_no      VARCHAR(100),
    lower_rate_percent  DECIMAL(8,4),
    valid_from          DATE NOT NULL,
    valid_to            DATE,
    remarks             TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tds_settings (
    company_id                   UUID PRIMARY KEY,
    enabled                      BOOLEAN NOT NULL DEFAULT true,
    tds_payable_ledger_name      VARCHAR(200) NOT NULL DEFAULT 'TDS Payable',
    tds_receivable_ledger_name   VARCHAR(200) NOT NULL DEFAULT 'TDS Receivable',
    round_off                    VARCHAR(20) NOT NULL DEFAULT 'NEAREST',
    auto_post_voucher            BOOLEAN NOT NULL DEFAULT true,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                   VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tds_transactions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL,
    branch_id            UUID,
    direction            VARCHAR(20) NOT NULL,
    section_id           UUID REFERENCES tds_sections(id) ON DELETE SET NULL,
    rate_percent         DECIMAL(8,4) NOT NULL DEFAULT 0,
    base_amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    tds_amount           DECIMAL(14,2) NOT NULL DEFAULT 0,
    party_type           VARCHAR(20) NOT NULL,
    party_id             VARCHAR(40),
    party_name           VARCHAR(200),
    party_pan            VARCHAR(20),
    source_type          VARCHAR(40) NOT NULL,
    source_id            VARCHAR(60),
    source_ref           VARCHAR(100),
    payment_mode         VARCHAR(30),
    transaction_date     DATE NOT NULL,
    financial_year       VARCHAR(20) NOT NULL,
    voucher_id           UUID,
    status               VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    reversed_by_txn_id   UUID,
    reversal_of_txn_id   UUID,
    narration            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS vendor_payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL,
    branch_id            UUID,
    payment_no           VARCHAR(40) NOT NULL,
    payment_date         DATE NOT NULL,
    vendor_id            VARCHAR(20) NOT NULL REFERENCES vendors(id),
    gross_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
    tds_amount           DECIMAL(14,2) NOT NULL DEFAULT 0,
    net_amount           DECIMAL(14,2) NOT NULL DEFAULT 0,
    tds_section_id       UUID REFERENCES tds_sections(id) ON DELETE SET NULL,
    tds_rate_percent     DECIMAL(8,4),
    tds_transaction_id   UUID,
    payment_mode         VARCHAR(30),
    reference_no         VARCHAR(100),
    narration            TEXT,
    expense_id           VARCHAR(20),
    booking_expense_id   UUID,
    status               VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_tds_rates_section ON tds_rates(company_id, section_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_tds_exemptions_party ON tds_exemptions(company_id, party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_tds_txn_company_date ON tds_transactions(company_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_tds_txn_party ON tds_transactions(company_id, party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON vendor_payments(company_id, vendor_id, payment_date DESC);

-- Ensure TDS ledgers exist per company (idempotent by company + name; codes unique globally)
INSERT INTO ledger_accounts (id, company_id, code, name, account_type, group_name, balance, is_active, created_at)
SELECT gen_random_uuid(), c.id,
       'TP' || substr(replace(c.id::text, '-', ''), 1, 8),
       'TDS Payable', 'Liability', 'Current Liabilities', 0, true, NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM ledger_accounts la WHERE la.company_id = c.id AND la.name = 'TDS Payable'
);

INSERT INTO ledger_accounts (id, company_id, code, name, account_type, group_name, balance, is_active, created_at)
SELECT gen_random_uuid(), c.id,
       'TR' || substr(replace(c.id::text, '-', ''), 1, 8),
       'TDS Receivable', 'Asset', 'Current Assets', 0, true, NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM ledger_accounts la WHERE la.company_id = c.id AND la.name = 'TDS Receivable'
);
