-- TMS Pro — PostgreSQL Schema
-- Run: psql -U postgres -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'Operator',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact         VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    gst             VARCHAR(20),
    address         TEXT,
    outstanding     DECIMAL(14,2) NOT NULL DEFAULT 0,
    credit_limit    DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_trips     INT NOT NULL DEFAULT 0,
    ledger_balance  DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendors (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact         VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    gst             VARCHAR(20),
    address         TEXT,
    outstanding     DECIMAL(14,2) NOT NULL DEFAULT 0,
    category        VARCHAR(50),
    total_bills     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    license         VARCHAR(30),
    license_expiry  DATE,
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    salary          DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance         DECIMAL(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'Active',
    trips           INT NOT NULL DEFAULT 0,
    rating          DECIMAL(3,1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
    id              VARCHAR(20) PRIMARY KEY,
    number          VARCHAR(20) NOT NULL UNIQUE,
    type            VARCHAR(50),
    model           VARCHAR(100),
    capacity        VARCHAR(20),
    owner           VARCHAR(20) DEFAULT 'Self',
    status          VARCHAR(30) NOT NULL DEFAULT 'Active',
    insurance       DATE,
    fitness         DATE,
    permit          DATE,
    puc             DATE,
    last_maintenance DATE,
    odometer        INT NOT NULL DEFAULT 0,
    trips           INT NOT NULL DEFAULT 0,
    revenue         DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    record_date     DATE NOT NULL,
    type            VARCHAR(100),
    record_type     VARCHAR(30) DEFAULT 'SCHEDULED',
    description     TEXT,
    odometer        INT,
    next_due_at     TIMESTAMPTZ,
    performed_at    TIMESTAMPTZ,
    cost            DECIMAL(12,2) NOT NULL DEFAULT 0,
    vendor          VARCHAR(200),
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type    VARCHAR(100) NOT NULL,
    interval_km     INT,
    interval_days   INT,
    last_service_at TIMESTAMPTZ,
    next_due_at     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spare_parts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    unit_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_qty   INT NOT NULL DEFAULT 0,
    min_stock   INT NOT NULL DEFAULT 5,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
    id              VARCHAR(20) PRIMARY KEY,
    booking_date    DATE NOT NULL,
    customer_id     VARCHAR(20) REFERENCES customers(id),
    customer_name   VARCHAR(200) NOT NULL,
    consignor       VARCHAR(200),
    consignee       VARCHAR(200),
    from_city       VARCHAR(100) NOT NULL,
    to_city         VARCHAR(100) NOT NULL,
    material        VARCHAR(100),
    quantity        VARCHAR(50),
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id),
    vehicle_number  VARCHAR(20),
    driver_id       VARCHAR(20) REFERENCES drivers(id),
    driver_name     VARCHAR(100),
    freight         DECIMAL(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending',
    payment         VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    advance         DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lorry_receipts (
    lr_number       VARCHAR(30) PRIMARY KEY,
    lr_date         DATE NOT NULL,
    booking_id      VARCHAR(20) REFERENCES bookings(id),
    consignor       VARCHAR(200),
    consignee       VARCHAR(200),
    from_city       VARCHAR(100) NOT NULL,
    to_city         VARCHAR(100) NOT NULL,
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id),
    vehicle_number  VARCHAR(20),
    driver_id       VARCHAR(20) REFERENCES drivers(id),
    driver_name     VARCHAR(100),
    material        VARCHAR(100),
    quantity        VARCHAR(50),
    freight         DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst             DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_type    VARCHAR(30) NOT NULL DEFAULT 'To Pay',
    hamali          DECIMAL(12,2) DEFAULT 0,
    loading_charges DECIMAL(12,2) DEFAULT 0,
    unloading_charges DECIMAL(12,2) DEFAULT 0,
    insurance       DECIMAL(12,2) DEFAULT 0,
    advance         DECIMAL(12,2) DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
    id              VARCHAR(20) PRIMARY KEY,
    expense_date    DATE NOT NULL,
    category        VARCHAR(50) NOT NULL,
    description     TEXT,
    vehicle_id      VARCHAR(20) REFERENCES vehicles(id),
    vehicle_number  VARCHAR(20),
    vendor_id       VARCHAR(20) REFERENCES vendors(id),
    vendor_name     VARCHAR(200),
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_mode    VARCHAR(30),
    status          VARCHAR(30) NOT NULL DEFAULT 'Approved',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    account_type    VARCHAR(50) NOT NULL,
    group_name      VARCHAR(50),
    balance         DECIMAL(14,2) NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no      VARCHAR(30) NOT NULL UNIQUE,
    voucher_date    DATE NOT NULL,
    voucher_type    VARCHAR(30) NOT NULL,
    party_name      VARCHAR(200),
    mode            VARCHAR(30),
    narration       TEXT,
    total_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE voucher_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id      UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    ledger_account_id UUID REFERENCES ledger_accounts(id),
    ledger_name     VARCHAR(200),
    debit           DECIMAL(14,2) NOT NULL DEFAULT 0,
    credit          DECIMAL(14,2) NOT NULL DEFAULT 0,
    line_narration  TEXT
);

CREATE TABLE company_settings (
    id              SERIAL PRIMARY KEY,
    company_id      UUID,
    company_name    VARCHAR(200),
    address         TEXT,
    gstin           VARCHAR(20),
    pan             VARCHAR(20),
    financial_year  VARCHAR(20),
    gst_rate        DECIMAL(5,2) DEFAULT 18,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_company_settings_company_id ON company_settings (company_id) WHERE company_id IS NOT NULL;

CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_lr_date ON lorry_receipts(lr_date);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_type ON vouchers(voucher_type);
