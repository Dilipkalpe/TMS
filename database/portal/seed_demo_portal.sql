-- Enable demo customer portal logins (idempotent).
-- Requires: customers C-001, C-002, C-004 and branches HO-MUM, PUN, DEL.
-- PINs: C-001=123456, C-004=234567, C-002=345678

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE customers c SET
  portal_enabled = true,
  portal_phone = '9820012345',
  portal_pin_hash = crypt('123456', gen_salt('bf', 11)),
  branch_id = COALESCE(c.branch_id, (SELECT id FROM branches WHERE code = 'HO-MUM' LIMIT 1)),
  updated_at = NOW()
WHERE c.id = 'C-001'
  AND (NOT c.portal_enabled OR c.portal_pin_hash IS NULL);

UPDATE customers c SET
  portal_enabled = true,
  portal_phone = '9820045678',
  portal_pin_hash = crypt('234567', gen_salt('bf', 11)),
  branch_id = COALESCE(c.branch_id, (SELECT id FROM branches WHERE code = 'PUN' LIMIT 1)),
  updated_at = NOW()
WHERE c.id = 'C-004'
  AND (NOT c.portal_enabled OR c.portal_pin_hash IS NULL);

UPDATE customers c SET
  portal_enabled = true,
  portal_phone = '9820023456',
  portal_pin_hash = crypt('345678', gen_salt('bf', 11)),
  branch_id = COALESCE(c.branch_id, (SELECT id FROM branches WHERE code = 'DEL' LIMIT 1)),
  updated_at = NOW()
WHERE c.id = 'C-002'
  AND (NOT c.portal_enabled OR c.portal_pin_hash IS NULL);

-- Ensure sample bookings exist for quick-track demo
INSERT INTO bookings (id, booking_date, customer_id, customer_name, consignor, consignee, from_city, to_city, goods, weight, vehicle_id, vehicle_no, driver_id, driver_name, freight, status, payment_status, advance, balance, remarks, created_at, updated_at)
VALUES
('BK-1042', CURRENT_DATE, 'C-001', 'Reliance Logistics', 'Reliance Industries', 'Reliance Retail Pune', 'Mumbai', 'Pune', 'Electronics', '12 MT', 'V-001', 'MH-12-AB-1234', 'D-001', 'Rajesh Kumar', 28500, 'Confirmed', 'Paid', 10000, 18500, NULL, NOW(), NOW()),
('BK-1041', CURRENT_DATE, 'C-002', 'Tata Steel Ltd', 'Tata Steel Jamshedpur', 'Tata Motors Kolkata', 'Jamshedpur', 'Kolkata', 'Steel Coils', '24 MT', 'V-002', 'MH-14-CD-5678', 'D-002', 'Suresh Patel', 52000, 'In Transit', 'Partial', 20000, 32000, NULL, NOW(), NOW()),
('BK-1039', CURRENT_DATE, 'C-004', 'Mahindra & Mahindra', 'M&M Nashik', 'M&M Mumbai', 'Nashik', 'Mumbai', 'Auto Parts', '8 MT', 'V-004', 'DL-01-GH-3456', 'D-004', 'Vikram Sharma', 18500, 'Pending', 'Unpaid', 0, 18500, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
