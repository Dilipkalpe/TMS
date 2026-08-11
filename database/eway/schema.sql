-- E-Way Bill tracking (TMS module; portal generate/cancel is stubbed separately)
CREATE TABLE IF NOT EXISTS eway_bills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    branch_id       UUID,
    lr_number       VARCHAR(80) NOT NULL,
    eway_bill_no    VARCHAR(50),
    eway_bill_date  DATE,
    valid_upto      DATE,
    vehicle_no      VARCHAR(40),
    from_place      VARCHAR(200),
    to_place        VARCHAR(200),
    document_value  DECIMAL(18,2),
    status          VARCHAR(30) NOT NULL DEFAULT 'Draft',
    source          VARCHAR(20) NOT NULL DEFAULT 'Manual',
    portal_ref      VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS ix_eway_bills_company_lr
    ON eway_bills (company_id, lr_number);

CREATE INDEX IF NOT EXISTS ix_eway_bills_company_status
    ON eway_bills (company_id, status);

CREATE INDEX IF NOT EXISTS ix_eway_bills_company_valid
    ON eway_bills (company_id, valid_upto);
