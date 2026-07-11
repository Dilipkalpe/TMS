-- TMS Pro — HR seed data (departments, designations, leave types, sync drivers)

INSERT INTO hr_departments (company_id, code, name, description) VALUES
    ('00000000-0000-4000-8000-000000000001', 'OPS', 'Operations', 'Fleet and trip operations'),
    ('00000000-0000-4000-8000-000000000001', 'ACC', 'Accounts', 'Finance and accounting'),
    ('00000000-0000-4000-8000-000000000001', 'ADM', 'Administration', 'Office administration'),
    ('00000000-0000-4000-8000-000000000001', 'WRK', 'Workshop', 'Vehicle maintenance')
ON CONFLICT (code) DO UPDATE SET
    company_id = COALESCE(hr_departments.company_id, EXCLUDED.company_id),
    name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO hr_designations (company_id, code, name, department_id, grade_level)
SELECT '00000000-0000-4000-8000-000000000001', v.code, v.name, d.id, v.grade
FROM (VALUES
    ('DRV', 'Driver', 'OPS', 3),
    ('SRV', 'Senior Driver', 'OPS', 4),
    ('ACC', 'Accountant', 'ACC', 4),
    ('CLK', 'Office Clerk', 'ADM', 2),
    ('MGR', 'Operations Manager', 'OPS', 6),
    ('MEC', 'Mechanic', 'WRK', 3)
) AS v(code, name, dept_code, grade)
JOIN hr_departments d ON d.code = v.dept_code
ON CONFLICT (code) DO UPDATE SET
    company_id = COALESCE(hr_designations.company_id, EXCLUDED.company_id),
    name = EXCLUDED.name,
    department_id = EXCLUDED.department_id,
    grade_level = EXCLUDED.grade_level;

INSERT INTO hr_leave_types (company_id, code, name, days_per_year, is_paid) VALUES
    ('00000000-0000-4000-8000-000000000001', 'CL', 'Casual Leave', 12, TRUE),
    ('00000000-0000-4000-8000-000000000001', 'SL', 'Sick Leave', 10, TRUE),
    ('00000000-0000-4000-8000-000000000001', 'EL', 'Earned Leave', 15, TRUE),
    ('00000000-0000-4000-8000-000000000001', 'LOP', 'Loss of Pay', 0, FALSE)
ON CONFLICT (code) DO UPDATE SET
    company_id = COALESCE(hr_leave_types.company_id, EXCLUDED.company_id);

-- Sync active drivers into hr_employees (idempotent — safe to re-run)
INSERT INTO hr_employees (
    company_id, employee_code, name, employee_type, driver_id, phone,
    basic_salary, advance, pf_applicable, status, date_of_joining,
    department_id, designation_id
)
SELECT
    COALESCE(d.company_id, '00000000-0000-4000-8000-000000000001'),
    'DRV-' || d.id,
    d.name,
    'Driver',
    d.id,
    d.phone,
    COALESCE(d.salary, 0),
    COALESCE(d.advance, 0),
    TRUE,
    CASE WHEN d.status = 'On Leave' THEN 'On Leave' ELSE 'Active' END,
    CURRENT_DATE - INTERVAL '1 year',
    (SELECT id FROM hr_departments WHERE code = 'OPS' AND company_id = COALESCE(d.company_id, '00000000-0000-4000-8000-000000000001') LIMIT 1),
    (SELECT id FROM hr_designations WHERE code = 'DRV' AND company_id = COALESCE(d.company_id, '00000000-0000-4000-8000-000000000001') LIMIT 1)
FROM drivers d
WHERE NOT EXISTS (
    SELECT 1 FROM hr_employees e
    WHERE e.driver_id = d.id AND e.employee_code <> 'DRV-' || d.id
)
ON CONFLICT (employee_code) DO UPDATE SET
    company_id = COALESCE(hr_employees.company_id, EXCLUDED.company_id),
    driver_id = EXCLUDED.driver_id,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    basic_salary = EXCLUDED.basic_salary,
    advance = EXCLUDED.advance,
    status = EXCLUDED.status,
    department_id = COALESCE(hr_employees.department_id, EXCLUDED.department_id),
    designation_id = COALESCE(hr_employees.designation_id, EXCLUDED.designation_id),
    updated_at = NOW();

-- Sample office staff
INSERT INTO hr_employees (
    company_id, employee_code, name, employee_type, employment_type, email, phone,
    basic_salary, daily_wage, hra, da, conveyance, date_of_joining, status,
    pf_applicable, esi_applicable, insurance_applicable, insurance_amount,
    department_id, designation_id
)
SELECT '00000000-0000-4000-8000-000000000001', v.code, v.name, v.etype, v.emp_type, v.email, v.phone,
       v.basic, v.daily, v.hra, v.da, v.conv, v.doj::DATE, 'Active',
       v.pf, v.esi, v.ins, v.ins_amt, d.id, g.id
FROM (VALUES
    ('EMP-001', 'Priya Sharma', 'Office', 'Permanent', 'priya@tms.local', '9876500001', 28000, 0, 5600, 2800, 1600, '2023-04-01', TRUE, TRUE, TRUE, 500, 'ADM', 'CLK'),
    ('EMP-002', 'Rajesh Kumar', 'Staff', 'Permanent', 'rajesh@tms.local', '9876500002', 35000, 0, 7000, 3500, 1600, '2022-08-15', TRUE, TRUE, TRUE, 500, 'ACC', 'ACC'),
    ('EMP-003', 'Suresh Patel', 'Mechanic', 'Contract', 'suresh@tms.local', '9876500003', 22000, 0, 2200, 2200, 800, '2024-01-10', FALSE, FALSE, TRUE, 300, 'WRK', 'MEC'),
    ('EMP-004', 'Amit Singh', 'Loader', 'Daily', 'amit@tms.local', '9876500004', 0, 650, 0, 0, 0, '2025-06-01', FALSE, FALSE, TRUE, 0, 'OPS', 'CLK')
) AS v(code, name, etype, emp_type, email, phone, basic, daily, hra, da, conv, doj, pf, esi, ins, ins_amt, dept_code, desig_code)
JOIN hr_departments d ON d.code = v.dept_code AND d.company_id = '00000000-0000-4000-8000-000000000001'
JOIN hr_designations g ON g.code = v.desig_code AND g.company_id = '00000000-0000-4000-8000-000000000001'
ON CONFLICT (employee_code) DO UPDATE SET
    company_id = COALESCE(hr_employees.company_id, EXCLUDED.company_id);

-- Leave balances for current year
INSERT INTO hr_leave_balances (company_id, employee_id, leave_type_id, year, allocated)
SELECT e.company_id, e.id, lt.id, EXTRACT(YEAR FROM CURRENT_DATE)::INT, lt.days_per_year
FROM hr_employees e
CROSS JOIN hr_leave_types lt
WHERE lt.code IN ('CL', 'SL', 'EL')
  AND e.status IN ('Active', 'On Leave')
  AND e.company_id = lt.company_id
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- National holidays sample
INSERT INTO hr_holidays (company_id, holiday_date, name, year) VALUES
    ('00000000-0000-4000-8000-000000000001', '2026-01-26', 'Republic Day', 2026),
    ('00000000-0000-4000-8000-000000000001', '2026-08-15', 'Independence Day', 2026),
    ('00000000-0000-4000-8000-000000000001', '2026-10-02', 'Gandhi Jayanti', 2026)
ON CONFLICT (holiday_date) DO UPDATE SET
    company_id = COALESCE(hr_holidays.company_id, EXCLUDED.company_id);
