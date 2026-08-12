-- Phase 1 commercial: freight rates, quotations, freight invoices
-- Applied by CommercialSchemaMigrator at API startup.

CREATE TABLE IF NOT EXISTS freight_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    customer_id     VARCHAR(20),
    from_city       VARCHAR(100) NOT NULL,
    to_city         VARCHAR(100) NOT NULL,
    vehicle_type    VARCHAR(50),
    rate_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    rate_unit       VARCHAR(20) NOT NULL DEFAULT 'PerTrip',
    valid_from      DATE,
    valid_to        DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freight_rates_lookup
    ON freight_rates (company_id, from_city, to_city, vehicle_type, customer_id);
CREATE INDEX IF NOT EXISTS idx_freight_rates_company ON freight_rates (company_id);

CREATE TABLE IF NOT EXISTS quotations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    quote_no        VARCHAR(30) NOT NULL,
    customer_id     VARCHAR(20),
    customer_name   VARCHAR(200) NOT NULL,
    from_city       VARCHAR(100) NOT NULL,
    to_city         VARCHAR(100) NOT NULL,
    vehicle_type    VARCHAR(50),
    freight         DECIMAL(12,2) NOT NULL DEFAULT 0,
    valid_until     DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Draft',
    notes           TEXT,
    booking_id      VARCHAR(20),
    freight_rate_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quotations_quote_no UNIQUE (quote_no)
);

CREATE INDEX IF NOT EXISTS idx_quotations_company ON quotations (company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations (company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations (customer_id);

CREATE TABLE IF NOT EXISTS quotation_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    description     VARCHAR(200) NOT NULL,
    qty             DECIMAL(12,2) NOT NULL DEFAULT 1,
    rate            DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quotation_lines_quote ON quotation_lines (quotation_id);

CREATE TABLE IF NOT EXISTS freight_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    invoice_no          VARCHAR(30) NOT NULL,
    booking_id          VARCHAR(20) NOT NULL,
    lr_number           VARCHAR(30),
    customer_id         VARCHAR(20),
    customer_name       VARCHAR(200),
    gstin               VARCHAR(20),
    place_of_supply     VARCHAR(100),
    bill_type           VARCHAR(20) NOT NULL DEFAULT 'FC',
    invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE,
    taxable_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance_adjusted    DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance             DECIMAL(12,2) NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'Issued',
    invoice_data        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_freight_invoices_no UNIQUE (invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_freight_invoices_company ON freight_invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_booking ON freight_invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_status ON freight_invoices (company_id, status);

CREATE TABLE IF NOT EXISTS freight_invoice_lines (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    freight_invoice_id  UUID NOT NULL REFERENCES freight_invoices(id) ON DELETE CASCADE,
    description         VARCHAR(200) NOT NULL,
    qty                 DECIMAL(12,2) NOT NULL DEFAULT 1,
    rate                DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order          INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_freight_invoice_lines_inv ON freight_invoice_lines (freight_invoice_id);

ALTER TABLE booking_payments
    ADD COLUMN IF NOT EXISTS freight_invoice_id UUID;

CREATE INDEX IF NOT EXISTS idx_booking_payments_invoice
    ON booking_payments (freight_invoice_id);

-- Direct LR / invoice payments use synthetic booking_id keys (LR:… / INV:…).
-- Drop FK so Pay works without a bookings row.
ALTER TABLE booking_payments DROP CONSTRAINT IF EXISTS booking_payments_booking_id_fkey;
