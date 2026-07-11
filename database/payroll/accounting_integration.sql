-- Payroll ↔ Accounting integration (attendant links + voucher refs)
-- Run after payroll schema and main accounting tables exist

ALTER TABLE payroll_runs
    ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES vouchers(id),
    ADD COLUMN IF NOT EXISTS voucher_no VARCHAR(30);

CREATE TABLE IF NOT EXISTS payroll_accounting_attendants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    voucher_id      UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
    voucher_no      VARCHAR(30) NOT NULL,
    link_type       VARCHAR(20) NOT NULL DEFAULT 'Payment'
                        CHECK (link_type IN ('Payment', 'Journal', 'Contra')),
    debit_ledger    VARCHAR(200),
    credit_ledger   VARCHAR(200),
    amount          DECIMAL(14,2) NOT NULL DEFAULT 0,
    narration       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payroll_attendants_run ON payroll_accounting_attendants(run_id);
CREATE INDEX IF NOT EXISTS ix_payroll_attendants_voucher ON payroll_accounting_attendants(voucher_id);

-- PF liability ledger (for payroll journal attendant)
INSERT INTO ledger_accounts (code, name, account_type, group_name, balance) VALUES
('2202', 'PF Payable', 'Liability', 'Liabilities', 0),
('1102', 'Driver Advance Receivable', 'Asset', 'Assets', 0)
ON CONFLICT (code) DO NOTHING;
