-- Item master for LR line items (description, HSN, default package type)

CREATE TABLE IF NOT EXISTS items (
    id                      VARCHAR(20) PRIMARY KEY,
    company_id              UUID NOT NULL,
    branch_id               UUID,
    name                    VARCHAR(200) NOT NULL,
    hsn                     VARCHAR(20),
    default_package_type    VARCHAR(30) DEFAULT 'Box',
    unit                    VARCHAR(20) DEFAULT 'Kg',
    remarks                 TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(200),
    updated_by              VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_items_company_name ON items(company_id, name);
CREATE INDEX IF NOT EXISTS idx_items_hsn ON items(hsn);
