-- LR process flow extension (loading sheet, transit pass, delivery sheet, LR expenses, status)
-- Run: psql -U postgres -d tms_pro -f database/lr/schema.sql

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'LR Created';

UPDATE lorry_receipts SET status = 'LR Created' WHERE status IS NULL OR status = '';

CREATE TABLE IF NOT EXISTS lr_loading_sheets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    lr_number           VARCHAR(64) NOT NULL,
    sheet_number        VARCHAR(30) NOT NULL,
    vehicle_number      VARCHAR(20),
    loading_location    VARCHAR(200) NOT NULL DEFAULT '',
    material_quantity   VARCHAR(50),
    loading_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    loading_status      VARCHAR(30) NOT NULL DEFAULT 'Completed',
    remarks             TEXT,
    created_by          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lr_loading_sheets_lr ON lr_loading_sheets(lr_number);
CREATE INDEX IF NOT EXISTS idx_lr_loading_sheets_company ON lr_loading_sheets(company_id);

CREATE TABLE IF NOT EXISTS lr_transit_passes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    lr_number           VARCHAR(64) NOT NULL,
    pass_number         VARCHAR(30) NOT NULL,
    vehicle_number      VARCHAR(20),
    driver_name         VARCHAR(100),
    route_from          VARCHAR(100) NOT NULL DEFAULT '',
    route_to            VARCHAR(100) NOT NULL DEFAULT '',
    via_points          TEXT,
    issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks             TEXT,
    created_by          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lr_transit_passes_lr ON lr_transit_passes(lr_number);
CREATE INDEX IF NOT EXISTS idx_lr_transit_passes_company ON lr_transit_passes(company_id);

CREATE TABLE IF NOT EXISTS lr_delivery_sheets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    lr_number           VARCHAR(64) NOT NULL,
    sheet_number        VARCHAR(30) NOT NULL,
    shipment_status     VARCHAR(30) NOT NULL DEFAULT 'In Transit',
    delivery_date       DATE,
    delivery_location   VARCHAR(200),
    receiver_name       VARCHAR(200),
    remarks             TEXT,
    created_by          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lr_delivery_sheets_lr ON lr_delivery_sheets(lr_number);
CREATE INDEX IF NOT EXISTS idx_lr_delivery_sheets_company ON lr_delivery_sheets(company_id);

CREATE TABLE IF NOT EXISTS lr_expenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    lr_number           VARCHAR(64) NOT NULL,
    expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    category            VARCHAR(50) NOT NULL,
    description         TEXT,
    amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
    attachment_url      TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'Pending',
    added_by            VARCHAR(100),
    approved_by         VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    rejection_remarks   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lr_expenses_lr ON lr_expenses(lr_number);
CREATE INDEX IF NOT EXISTS idx_lr_expenses_company_status ON lr_expenses(company_id, status);
