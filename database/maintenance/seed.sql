-- Demo predictive maintenance data (idempotent)
INSERT INTO maintenance_schedules (vehicle_id, service_type, interval_km, interval_days, last_service_at, next_due_at, is_active)
SELECT v.id, 'Engine Oil Change', 10000, 180, NOW() - INTERVAL '120 days', NOW() + INTERVAL '60 days', true
FROM vehicles v
WHERE v.id = 'V-001'
  AND NOT EXISTS (SELECT 1 FROM maintenance_schedules s WHERE s.vehicle_id = v.id AND s.service_type = 'Engine Oil Change');

INSERT INTO maintenance_schedules (vehicle_id, service_type, interval_km, interval_days, last_service_at, next_due_at, is_active)
SELECT v.id, 'Engine Overhaul Check', 80000, 730, NOW() - INTERVAL '800 days', NOW() - INTERVAL '70 days', true
FROM vehicles v
WHERE v.id = 'V-004'
  AND NOT EXISTS (SELECT 1 FROM maintenance_schedules s WHERE s.vehicle_id = v.id AND s.service_type = 'Engine Overhaul Check');

INSERT INTO maintenance_schedules (vehicle_id, service_type, interval_km, interval_days, last_service_at, next_due_at, is_active)
SELECT v.id, 'Tyre Rotation', 15000, 365, NOW() - INTERVAL '200 days', NOW() - INTERVAL '10 days', true
FROM vehicles v
WHERE v.id = 'V-004'
  AND NOT EXISTS (SELECT 1 FROM maintenance_schedules s WHERE s.vehicle_id = v.id AND s.service_type = 'Tyre Rotation');

INSERT INTO maintenance_schedules (vehicle_id, service_type, interval_km, interval_days, last_service_at, next_due_at, is_active)
SELECT v.id, 'Brake Inspection', 20000, 365, NOW() - INTERVAL '90 days', NOW() + INTERVAL '275 days', true
FROM vehicles v
WHERE v.id = 'V-002'
  AND NOT EXISTS (SELECT 1 FROM maintenance_schedules s WHERE s.vehicle_id = v.id AND s.service_type = 'Brake Inspection');

UPDATE vehicles SET odometer = 85000 WHERE id = 'V-001' AND odometer = 0;
UPDATE vehicles SET odometer = 62000 WHERE id = 'V-002' AND odometer = 0;
UPDATE vehicles SET odometer = 91000 WHERE id = 'V-004' AND odometer = 0;

INSERT INTO spare_parts (sku, name, unit_cost, stock_qty, min_stock) VALUES
    ('ENG-OIL-15W40', 'Engine Oil 15W40 (20L)', 4200, 12, 5),
    ('BRK-PAD-FR', 'Front Brake Pads Set', 2800, 8, 4),
    ('AIR-FILTER', 'Air Filter Heavy Duty', 850, 3, 5),
    ('TYRE-295-80', 'Tyre 295/80R22.5', 18500, 4, 2)
ON CONFLICT (sku) DO NOTHING;
