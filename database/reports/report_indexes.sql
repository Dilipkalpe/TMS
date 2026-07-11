-- Indexes supporting accounting report stored procedures (idempotent)

CREATE INDEX IF NOT EXISTS idx_vouchers_company_type_date
    ON vouchers (company_id, voucher_type, voucher_date DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payments_company_date
    ON booking_payments (company_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_booking_expenses_company_date
    ON booking_expenses (company_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_booking_broker_charges_company_created
    ON booking_broker_charges (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_company_vendor_date
    ON expenses (company_id, expense_date DESC)
    WHERE vendor_name IS NOT NULL;

ANALYZE vouchers, booking_payments, booking_expenses, booking_broker_charges, expenses, lorry_receipts;
