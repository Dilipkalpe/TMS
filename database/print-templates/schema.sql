-- Print template configuration per company / user / module
CREATE TABLE IF NOT EXISTS print_template_configurations (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID,
    module_code VARCHAR(40) NOT NULL,
    template_code VARCHAR(10) NOT NULL DEFAULT 'T1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by VARCHAR(120),
    modified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_print_template_config_company
    ON print_template_configurations (company_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_template_config_user_module
    ON print_template_configurations (company_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), module_code)
    WHERE is_active = TRUE;
