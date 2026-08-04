-- LR status change audit trail (idempotent)
CREATE TABLE IF NOT EXISTS lr_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    lr_number VARCHAR(64) NOT NULL REFERENCES lorry_receipts(lr_number) ON DELETE CASCADE,
    old_status VARCHAR(64),
    new_status VARCHAR(64) NOT NULL,
    changed_by VARCHAR(128),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_lr_status_history_lr ON lr_status_history (lr_number, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lr_status_history_company ON lr_status_history (company_id, changed_at DESC);
