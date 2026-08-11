-- Hub Transfer / Re-Manifest module
CREATE TABLE IF NOT EXISTS hub_manifests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    branch_id               UUID,
    manifest_no             VARCHAR(80) NOT NULL,
    from_hub_branch_id      UUID,
    from_hub_name           VARCHAR(200) NOT NULL DEFAULT '',
    to_destination          VARCHAR(200) NOT NULL DEFAULT '',
    vehicle_id              VARCHAR(80),
    vehicle_number          VARCHAR(40),
    vehicle_type            VARCHAR(80),
    driver_id               VARCHAR(80),
    driver_name             VARCHAR(200),
    driver_mobile           VARCHAR(40),
    status                  VARCHAR(40) NOT NULL DEFAULT 'Draft',
    dispatch_at             TIMESTAMPTZ,
    source_loading_sheet_id UUID,
    is_inbound              BOOLEAN NOT NULL DEFAULT FALSE,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_hub_manifests_company_no
    ON hub_manifests (company_id, manifest_no);
CREATE INDEX IF NOT EXISTS ix_hub_manifests_company_status
    ON hub_manifests (company_id, status);
CREATE INDEX IF NOT EXISTS ix_hub_manifests_company_hub
    ON hub_manifests (company_id, from_hub_branch_id);

CREATE TABLE IF NOT EXISTS hub_manifest_lrs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id     UUID NOT NULL REFERENCES hub_manifests(id) ON DELETE CASCADE,
    lr_number       VARCHAR(80) NOT NULL,
    packages        INT,
    weight          DECIMAL(18,3),
    sort_order      INT NOT NULL DEFAULT 0,
    line_status     VARCHAR(40) NOT NULL DEFAULT 'Assigned',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_hub_manifest_lrs_manifest_lr
    ON hub_manifest_lrs (manifest_id, lr_number);
CREATE INDEX IF NOT EXISTS ix_hub_manifest_lrs_lr
    ON hub_manifest_lrs (lr_number);

CREATE TABLE IF NOT EXISTS lr_movements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    lr_number               VARCHAR(80) NOT NULL,
    movement_no             INT NOT NULL,
    movement_type           VARCHAR(40) NOT NULL DEFAULT 'HubTransfer',
    from_location           VARCHAR(200) NOT NULL DEFAULT '',
    to_location             VARCHAR(200) NOT NULL DEFAULT '',
    current_hub_branch_id   UUID,
    current_hub_name        VARCHAR(200),
    vehicle_id              VARCHAR(80),
    vehicle_number          VARCHAR(40),
    driver_id               VARCHAR(80),
    driver_name             VARCHAR(200),
    manifest_id             UUID REFERENCES hub_manifests(id) ON DELETE SET NULL,
    status                  VARCHAR(40) NOT NULL DEFAULT 'Created',
    dispatch_at             TIMESTAMPTZ,
    hub_received_at         TIMESTAMPTZ,
    unload_at               TIMESTAMPTZ,
    delivery_at             TIMESTAMPTZ,
    received_by             VARCHAR(100),
    remarks                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_lr_movements_company_lr_no
    ON lr_movements (company_id, lr_number, movement_no);
CREATE INDEX IF NOT EXISTS ix_lr_movements_company_lr
    ON lr_movements (company_id, lr_number);
CREATE INDEX IF NOT EXISTS ix_lr_movements_company_status
    ON lr_movements (company_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_lr_movements_one_active
    ON lr_movements (company_id, lr_number)
    WHERE status NOT IN ('Delivered', 'Cancelled', 'Completed', 'ReManifested');

CREATE TABLE IF NOT EXISTS hub_transfer_audits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    lr_number       VARCHAR(80),
    manifest_id     UUID,
    movement_id     UUID,
    action          VARCHAR(80) NOT NULL,
    previous_status VARCHAR(40),
    new_status      VARCHAR(40),
    remarks         TEXT,
    performed_by    VARCHAR(100),
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hub_transfer_audits_company_lr
    ON hub_transfer_audits (company_id, lr_number);
CREATE INDEX IF NOT EXISTS ix_hub_transfer_audits_manifest
    ON hub_transfer_audits (manifest_id);
