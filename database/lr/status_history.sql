-- LR status change audit trail (idempotent)
-- Requires UNIQUE/PK on lorry_receipts.lr_number (ensured at startup in LrSchemaMigrator).
CREATE TABLE IF NOT EXISTS lr_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    lr_number VARCHAR(64) NOT NULL,
    old_status VARCHAR(64),
    new_status VARCHAR(64) NOT NULL,
    changed_by VARCHAR(128),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'lr_status_history'
      AND c.conname = 'lr_status_history_lr_number_fkey'
  ) THEN
    ALTER TABLE lr_status_history
      ADD CONSTRAINT lr_status_history_lr_number_fkey
      FOREIGN KEY (lr_number) REFERENCES lorry_receipts(lr_number) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lr_status_history_lr ON lr_status_history (lr_number, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lr_status_history_company ON lr_status_history (company_id, changed_at DESC);
