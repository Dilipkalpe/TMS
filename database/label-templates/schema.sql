-- Package label templates (DB-driven layout JSON)
CREATE TABLE IF NOT EXISTS label_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    template_name   VARCHAR(120) NOT NULL,
    template_type   VARCHAR(40) NOT NULL DEFAULT 'LR_PACKAGE',
    paper_width     NUMERIC(10,2) NOT NULL DEFAULT 100,
    paper_height    NUMERIC(10,2) NOT NULL DEFAULT 150,
    template_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      VARCHAR(120),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_label_templates_company
    ON label_templates (company_id);

CREATE INDEX IF NOT EXISTS idx_label_templates_company_type
    ON label_templates (company_id, template_type)
    WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_label_templates_one_default
    ON label_templates (company_id, template_type)
    WHERE is_default = TRUE AND is_active = TRUE;
