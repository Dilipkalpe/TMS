-- TMS Pro — Payroll module tables
-- Run after main schema.sql

CREATE TABLE IF NOT EXISTS payroll_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code            VARCHAR(30) NOT NULL UNIQUE,
    pay_month           INT NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
    pay_year            INT NOT NULL CHECK (pay_year BETWEEN 2000 AND 2100),
    period_label        VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Draft'
                            CHECK (status IN ('Draft', 'Processed', 'Paid', 'Cancelled')),
    total_gross         DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_deductions    DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_net           DECIMAL(14,2) NOT NULL DEFAULT 0,
    entry_count         INT NOT NULL DEFAULT 0,
    payment_mode        VARCHAR(30),
    processed_at        TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,
    remarks             TEXT,
    created_by          VARCHAR(100) DEFAULT 'system',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow only one non-cancelled run per month/year
CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_runs_period_active
    ON payroll_runs (pay_month, pay_year)
    WHERE status IN ('Draft', 'Processed', 'Paid');

CREATE TABLE IF NOT EXISTS payroll_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_type       VARCHAR(20) NOT NULL DEFAULT 'Driver',
    employee_id         VARCHAR(20) NOT NULL,
    employee_name       VARCHAR(200) NOT NULL,
    basic_salary        DECIMAL(12,2) NOT NULL DEFAULT 0,
    trip_incentive      DECIMAL(12,2) NOT NULL DEFAULT 0,
    overtime            DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_allowance     DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_pay           DECIMAL(12,2) NOT NULL DEFAULT 0,
    pf_deduction        DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance_recovery    DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_deduction     DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_pay             DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                            CHECK (payment_status IN ('Pending', 'Paid')),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payroll_entries_run ON payroll_entries(run_id);
CREATE INDEX IF NOT EXISTS ix_payroll_entries_employee ON payroll_entries(employee_id);
