-- TMS Pro SaaS: multi-tenant companies, subscription plans, company_id on all business tables

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    gstin VARCHAR(20),
    email VARCHAR(200),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    price_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    max_users INT,
    max_bookings_month INT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at DATE,
    amount_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id);

CREATE TABLE IF NOT EXISTS company_usage (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    usage_month DATE NOT NULL,
    bookings_count INT NOT NULL DEFAULT 0,
    users_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (company_id, usage_month)
);

INSERT INTO subscription_plans (code, name, price_inr, max_users, max_bookings_month, features, is_custom, sort_order)
VALUES
    ('starter', 'Starter', 999, 2, 500, '["booking","lr","billing","outstanding"]'::jsonb, FALSE, 1),
    ('professional', 'Professional', 2499, NULL, NULL, '["booking","lr","billing","outstanding","accounting","dashboard","profit_loss","balance_sheet","gst","export","unlimited_users"]'::jsonb, FALSE, 2),
    ('enterprise', 'Enterprise', 0, NULL, NULL, '["booking","lr","billing","outstanding","accounting","dashboard","profit_loss","balance_sheet","gst","export","unlimited_users","multi_branch","api","whatsapp","mobile_app","priority_support"]'::jsonb, TRUE, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, price_inr = EXCLUDED.price_inr, max_users = EXCLUDED.max_users,
    max_bookings_month = EXCLUDED.max_bookings_month, features = EXCLUDED.features,
    is_custom = EXCLUDED.is_custom, sort_order = EXCLUDED.sort_order;

INSERT INTO companies (id, code, name, legal_name, is_active)
VALUES ('00000000-0000-4000-8000-000000000001', 'DEFAULT', 'Demo Company', 'Demo Company Pvt Ltd', TRUE)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE lorry_receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE booking_broker_charges ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE booking_expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE transport_bills ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE provisions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE ledger_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

UPDATE users SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL AND role NOT IN ('Super Admin', 'Platform Super Admin');
UPDATE branches SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE customers SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE vendors SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE drivers SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE vehicles SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE bookings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE lorry_receipts SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE expenses SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE brokers SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE booking_broker_charges SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE booking_expenses SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE booking_payments SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE transport_bills SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE provisions SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE ledger_accounts SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE vouchers SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE voucher_lines SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE company_settings SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;
UPDATE trips SET company_id = '00000000-0000-4000-8000-000000000001' WHERE company_id IS NULL;

ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_company_code ON branches(company_id, code);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_company_username ON users(company_id, username) WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_platform_username ON users(username) WHERE company_id IS NULL;

INSERT INTO company_subscriptions (company_id, plan_id, status, amount_inr)
SELECT c.id, p.id, 'active', p.price_inr
FROM companies c
CROSS JOIN subscription_plans p
WHERE c.code = 'DEFAULT' AND p.code = 'professional'
AND NOT EXISTS (SELECT 1 FROM company_subscriptions cs WHERE cs.company_id = c.id AND cs.status = 'active');

CREATE INDEX IF NOT EXISTS idx_bookings_company ON bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);
