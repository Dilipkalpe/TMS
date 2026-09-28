-- Demo Driver Web Portal logins (run once against tms_pro)
-- URL: /driver/login

UPDATE drivers SET
  portal_enabled = true,
  portal_phone = '9876543210',
  portal_pin_hash = crypt('123456', gen_salt('bf', 11)),
  updated_at = NOW()
WHERE id = 'D-001';

UPDATE drivers SET
  portal_enabled = true,
  portal_phone = '9876543211',
  portal_pin_hash = crypt('234567', gen_salt('bf', 11)),
  updated_at = NOW()
WHERE id = 'D-002';

UPDATE drivers SET
  portal_enabled = true,
  portal_phone = '9876543214',
  portal_pin_hash = crypt('345678', gen_salt('bf', 11)),
  updated_at = NOW()
WHERE id = 'D-005';
