-- Company + branch isolation: add branch_id where missing and backfill from bookings / HO.

ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE freight_rates ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE freight_invoices ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lorry_receipts_branch ON lorry_receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_vendors_branch ON vendors(branch_id);
CREATE INDEX IF NOT EXISTS idx_freight_rates_branch ON freight_rates(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotations_branch ON quotations(branch_id);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_branch ON freight_invoices(branch_id);

-- Backfill LR from linked booking
UPDATE lorry_receipts lr
SET branch_id = b.branch_id
FROM bookings b
WHERE lr.booking_id = b.id
  AND lr.branch_id IS NULL
  AND b.branch_id IS NOT NULL;

-- Backfill freight invoices from booking
UPDATE freight_invoices fi
SET branch_id = b.branch_id
FROM bookings b
WHERE fi.booking_id = b.id
  AND fi.branch_id IS NULL
  AND b.branch_id IS NOT NULL;

-- Remaining NULLs → company head office (or first branch)
UPDATE lorry_receipts lr
SET branch_id = ho.id
FROM (
    SELECT DISTINCT ON (company_id) company_id, id
    FROM branches
    WHERE is_active = TRUE
    ORDER BY company_id, is_head_office DESC, code
) ho
WHERE lr.company_id = ho.company_id AND lr.branch_id IS NULL;

UPDATE vendors v
SET branch_id = ho.id
FROM (
    SELECT DISTINCT ON (company_id) company_id, id
    FROM branches
    WHERE is_active = TRUE
    ORDER BY company_id, is_head_office DESC, code
) ho
WHERE v.company_id = ho.company_id AND v.branch_id IS NULL;

UPDATE freight_rates fr
SET branch_id = ho.id
FROM (
    SELECT DISTINCT ON (company_id) company_id, id
    FROM branches
    WHERE is_active = TRUE
    ORDER BY company_id, is_head_office DESC, code
) ho
WHERE fr.company_id = ho.company_id AND fr.branch_id IS NULL;

UPDATE quotations q
SET branch_id = ho.id
FROM (
    SELECT DISTINCT ON (company_id) company_id, id
    FROM branches
    WHERE is_active = TRUE
    ORDER BY company_id, is_head_office DESC, code
) ho
WHERE q.company_id = ho.company_id AND q.branch_id IS NULL;

UPDATE freight_invoices fi
SET branch_id = ho.id
FROM (
    SELECT DISTINCT ON (company_id) company_id, id
    FROM branches
    WHERE is_active = TRUE
    ORDER BY company_id, is_head_office DESC, code
) ho
WHERE fi.company_id = ho.company_id AND fi.branch_id IS NULL;
