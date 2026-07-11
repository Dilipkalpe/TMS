-- Booking finance extension (broker, expenses, payments, bills, provisions)
-- Run: psql -U postgres -d tms_pro -f database/booking_finance/schema.sql

CREATE TABLE IF NOT EXISTS brokers (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    phone           VARCHAR(20),
    gst             VARCHAR(20),
    address         TEXT,
    outstanding     DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_broker_charges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      VARCHAR(20) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    broker_id       VARCHAR(20) REFERENCES brokers(id),
    broker_name     VARCHAR(200) NOT NULL,
    charge_type     VARCHAR(50) NOT NULL DEFAULT 'Commission',
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_broker_charges_booking ON booking_broker_charges(booking_id);

CREATE TABLE IF NOT EXISTS booking_expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      VARCHAR(20) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    category        VARCHAR(50) NOT NULL,
    description     TEXT,
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    vendor_id       VARCHAR(20) REFERENCES vendors(id),
    vendor_name     VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_expenses_booking ON booking_expenses(booking_id);

CREATE TABLE IF NOT EXISTS booking_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      VARCHAR(20) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_mode    VARCHAR(30),
    reference_no    VARCHAR(50),
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);

CREATE TABLE IF NOT EXISTS provisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provision_type  VARCHAR(20) NOT NULL,
    party_id        VARCHAR(20),
    party_name      VARCHAR(200) NOT NULL,
    provision_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    reference_no    VARCHAR(50),
    remarks         TEXT,
    is_reversed     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provisions_type ON provisions(provision_type, party_id);

CREATE TABLE IF NOT EXISTS transport_bills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no         VARCHAR(30) NOT NULL UNIQUE,
    bill_type       VARCHAR(10) NOT NULL,
    booking_id      VARCHAR(20) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name   VARCHAR(200),
    gstin           VARCHAR(20),
    place_of_supply VARCHAR(100),
    taxable_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    bill_data       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_bills_booking ON transport_bills(booking_id);
