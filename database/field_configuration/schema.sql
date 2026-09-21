-- Dynamic field configuration for Booking and LR modules (per company).
-- Applied by FieldConfigurationSchemaMigrator at API startup.

CREATE TABLE IF NOT EXISTS field_configurations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    module                  VARCHAR(40) NOT NULL,
    technical_field_name    VARCHAR(80) NOT NULL,
    default_display_name    VARCHAR(120) NOT NULL,
    custom_display_name     VARCHAR(120) NULL,
    is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
    is_required             BOOLEAN NOT NULL DEFAULT FALSE,
    display_order           INT NOT NULL DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_field_configurations UNIQUE (company_id, module, technical_field_name),
    CONSTRAINT ck_field_configurations_module CHECK (module IN ('Booking', 'LR')),
    CONSTRAINT ck_field_configurations_order CHECK (display_order >= 0),
    CONSTRAINT ck_field_configurations_custom_len CHECK (
        custom_display_name IS NULL OR char_length(custom_display_name) <= 120
    )
);

CREATE INDEX IF NOT EXISTS idx_field_configurations_company_module
    ON field_configurations (company_id, module)
    WHERE is_active = TRUE;
