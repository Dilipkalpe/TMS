-- Consignor & Consignee masters and LR FK links
-- Run: psql -U tms -d tms_pro -f database/lr/consignor_consignee.sql

CREATE TABLE IF NOT EXISTS consignors (
    id                      VARCHAR(20) PRIMARY KEY,
    company_id              UUID NOT NULL,
    branch_id               UUID,
    name                    VARCHAR(200) NOT NULL,
    company_name            VARCHAR(200),
    contact                 VARCHAR(100),
    phone                   VARCHAR(20),
    email                   VARCHAR(100),
    gst                     VARCHAR(20),
    pan                     VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    pincode                 VARCHAR(10),
    default_from_location   VARCHAR(200),
    status                  VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS consignees (
    id                      VARCHAR(20) PRIMARY KEY,
    company_id              UUID NOT NULL,
    branch_id               UUID,
    name                    VARCHAR(200) NOT NULL,
    company_name            VARCHAR(200),
    contact                 VARCHAR(100),
    phone                   VARCHAR(20),
    email                   VARCHAR(100),
    gst                     VARCHAR(20),
    pan                     VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    state                    VARCHAR(100),
    pincode                 VARCHAR(10),
    default_to_location     VARCHAR(200),
    status                  VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_consignors_company ON consignors(company_id);
CREATE INDEX IF NOT EXISTS idx_consignors_name ON consignors(name);
CREATE INDEX IF NOT EXISTS idx_consignors_city ON consignors(city);
CREATE INDEX IF NOT EXISTS idx_consignors_gst ON consignors(gst);
CREATE INDEX IF NOT EXISTS idx_consignors_phone ON consignors(phone);
CREATE INDEX IF NOT EXISTS idx_consignors_status ON consignors(status);

CREATE INDEX IF NOT EXISTS idx_consignees_company ON consignees(company_id);
CREATE INDEX IF NOT EXISTS idx_consignees_name ON consignees(name);
CREATE INDEX IF NOT EXISTS idx_consignees_city ON consignees(city);
CREATE INDEX IF NOT EXISTS idx_consignees_gst ON consignees(gst);
CREATE INDEX IF NOT EXISTS idx_consignees_phone ON consignees(phone);
CREATE INDEX IF NOT EXISTS idx_consignees_status ON consignees(status);

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS consignor_id VARCHAR(20);
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS consignee_id VARCHAR(20);
