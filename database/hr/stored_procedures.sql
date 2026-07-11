-- TMS Pro — HR stored procedures

-- Dashboard summary
CREATE OR REPLACE FUNCTION sp_hr_summary()
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    on_leave BIGINT,
    departments BIGINT,
    pending_leaves BIGINT,
    today_present BIGINT,
    today_absent BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM hr_employees)::BIGINT,
        (SELECT COUNT(*) FROM hr_employees WHERE status = 'Active')::BIGINT,
        (SELECT COUNT(*) FROM hr_employees WHERE status = 'On Leave')::BIGINT,
        (SELECT COUNT(*) FROM hr_departments WHERE status = 'Active')::BIGINT,
        (SELECT COUNT(*) FROM hr_leave_requests WHERE status = 'Pending')::BIGINT,
        (SELECT COUNT(*) FROM hr_attendance a
         JOIN hr_employees e ON e.id = a.employee_id
         WHERE a.attendance_date = CURRENT_DATE AND a.status = 'Present')::BIGINT,
        (SELECT COUNT(*) FROM hr_attendance a
         JOIN hr_employees e ON e.id = a.employee_id
         WHERE a.attendance_date = CURRENT_DATE AND a.status = 'Absent')::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Departments
CREATE OR REPLACE FUNCTION sp_hr_list_departments()
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, description TEXT,
    status VARCHAR, employee_count BIGINT, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.code, d.name, d.description, d.status,
           (SELECT COUNT(*) FROM hr_employees e WHERE e.department_id = d.id)::BIGINT,
           d.created_at
    FROM hr_departments d
    ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_save_department(
    p_id UUID, p_code VARCHAR, p_name VARCHAR,
    p_description TEXT DEFAULT NULL, p_status VARCHAR DEFAULT 'Active'
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO hr_departments (code, name, description, status)
        VALUES (p_code, p_name, p_description, COALESCE(p_status, 'Active'))
        RETURNING id INTO v_id;
    ELSE
        UPDATE hr_departments SET
            code = p_code, name = p_name, description = p_description,
            status = COALESCE(p_status, status), updated_at = NOW()
        WHERE id = p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Designations
CREATE OR REPLACE FUNCTION sp_hr_list_designations()
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, department_id UUID,
    department_name VARCHAR, grade_level INT, status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.code, g.name, g.department_id,
           d.name, g.grade_level, g.status
    FROM hr_designations g
    LEFT JOIN hr_departments d ON d.id = g.department_id
    ORDER BY g.name;
END;
$$ LANGUAGE plpgsql;

-- Employees
CREATE OR REPLACE FUNCTION sp_hr_list_employees(
    p_department_id UUID DEFAULT NULL,
    p_employee_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, basic_salary DECIMAL, hra DECIMAL, da DECIMAL,
    conveyance DECIMAL, other_allowance DECIMAL, advance DECIMAL,
    pf_applicable BOOLEAN, status VARCHAR, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.employee_code, e.name, e.employee_type,
           e.department_id, d.name,
           e.designation_id, g.name,
           e.driver_id, e.email, e.phone,
           e.date_of_joining, e.basic_salary, e.hra, e.da,
           e.conveyance, e.other_allowance, e.advance,
           e.pf_applicable, e.status, e.created_at
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE (p_department_id IS NULL OR e.department_id = p_department_id)
      AND (p_employee_type IS NULL OR p_employee_type = '' OR e.employee_type = p_employee_type)
      AND (p_status IS NULL OR p_status = '' OR e.status = p_status)
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_get_employee(p_id UUID)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, date_of_birth DATE, gender VARCHAR, address TEXT,
    bank_account VARCHAR, bank_ifsc VARCHAR, pan VARCHAR,
    basic_salary DECIMAL, hra DECIMAL, da DECIMAL, conveyance DECIMAL,
    other_allowance DECIMAL, advance DECIMAL, pf_applicable BOOLEAN,
    status VARCHAR, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.employee_code, e.name, e.employee_type,
           e.department_id, d.name, e.designation_id, g.name,
           e.driver_id, e.email, e.phone,
           e.date_of_joining, e.date_of_birth, e.gender, e.address,
           e.bank_account, e.bank_ifsc, e.pan,
           e.basic_salary, e.hra, e.da, e.conveyance, e.other_allowance,
           e.advance, e.pf_applicable, e.status, e.created_at
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE e.id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_save_employee(
    p_id UUID, p_employee_code VARCHAR, p_name VARCHAR,
    p_employee_type VARCHAR DEFAULT 'Staff',
    p_department_id UUID DEFAULT NULL, p_designation_id UUID DEFAULT NULL,
    p_driver_id VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL, p_phone VARCHAR DEFAULT NULL,
    p_date_of_joining DATE DEFAULT NULL, p_date_of_birth DATE DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL, p_address TEXT DEFAULT NULL,
    p_bank_account VARCHAR DEFAULT NULL, p_bank_ifsc VARCHAR DEFAULT NULL,
    p_pan VARCHAR DEFAULT NULL,
    p_basic_salary DECIMAL DEFAULT 0, p_hra DECIMAL DEFAULT 0,
    p_da DECIMAL DEFAULT 0, p_conveyance DECIMAL DEFAULT 0,
    p_other_allowance DECIMAL DEFAULT 0, p_advance DECIMAL DEFAULT 0,
    p_pf_applicable BOOLEAN DEFAULT TRUE, p_status VARCHAR DEFAULT 'Active'
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO hr_employees (
            employee_code, name, employee_type, department_id, designation_id,
            driver_id, email, phone, date_of_joining, date_of_birth, gender,
            address, bank_account, bank_ifsc, pan,
            basic_salary, hra, da, conveyance, other_allowance, advance,
            pf_applicable, status
        ) VALUES (
            p_employee_code, p_name, COALESCE(p_employee_type, 'Staff'),
            p_department_id, p_designation_id, p_driver_id,
            p_email, p_phone, p_date_of_joining, p_date_of_birth, p_gender,
            p_address, p_bank_account, p_bank_ifsc, p_pan,
            COALESCE(p_basic_salary, 0), COALESCE(p_hra, 0), COALESCE(p_da, 0),
            COALESCE(p_conveyance, 0), COALESCE(p_other_allowance, 0),
            COALESCE(p_advance, 0), COALESCE(p_pf_applicable, TRUE),
            COALESCE(p_status, 'Active')
        ) RETURNING id INTO v_id;
    ELSE
        UPDATE hr_employees SET
            employee_code = p_employee_code, name = p_name,
            employee_type = COALESCE(p_employee_type, employee_type),
            department_id = p_department_id, designation_id = p_designation_id,
            driver_id = p_driver_id, email = p_email, phone = p_phone,
            date_of_joining = p_date_of_joining, date_of_birth = p_date_of_birth,
            gender = p_gender, address = p_address,
            bank_account = p_bank_account, bank_ifsc = p_bank_ifsc, pan = p_pan,
            basic_salary = COALESCE(p_basic_salary, basic_salary),
            hra = COALESCE(p_hra, hra), da = COALESCE(p_da, da),
            conveyance = COALESCE(p_conveyance, conveyance),
            other_allowance = COALESCE(p_other_allowance, other_allowance),
            advance = COALESCE(p_advance, advance),
            pf_applicable = COALESCE(p_pf_applicable, pf_applicable),
            status = COALESCE(p_status, status),
            updated_at = NOW()
        WHERE id = p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_delete_employee(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM hr_employees WHERE id = p_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Attendance
CREATE OR REPLACE FUNCTION sp_hr_list_attendance(
    p_date DATE DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_month INT DEFAULT NULL,
    p_year INT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_id UUID, employee_code VARCHAR, employee_name VARCHAR,
    attendance_date DATE, status VARCHAR, check_in TIME, check_out TIME,
    overtime_hours DECIMAL, remarks TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.employee_id, e.employee_code, e.name,
           a.attendance_date, a.status, a.check_in, a.check_out,
           a.overtime_hours, a.remarks
    FROM hr_attendance a
    JOIN hr_employees e ON e.id = a.employee_id
    WHERE (p_date IS NULL OR a.attendance_date = p_date)
      AND (p_employee_id IS NULL OR a.employee_id = p_employee_id)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM a.attendance_date) = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM a.attendance_date) = p_year)
    ORDER BY a.attendance_date DESC, e.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_mark_attendance(
    p_employee_id UUID, p_date DATE, p_status VARCHAR,
    p_check_in TIME DEFAULT NULL, p_check_out TIME DEFAULT NULL,
    p_overtime_hours DECIMAL DEFAULT 0, p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO hr_attendance (employee_id, attendance_date, status, check_in, check_out, overtime_hours, remarks)
    VALUES (p_employee_id, p_date, p_status, p_check_in, p_check_out, COALESCE(p_overtime_hours, 0), p_remarks)
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
        status = EXCLUDED.status,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        overtime_hours = EXCLUDED.overtime_hours,
        remarks = EXCLUDED.remarks,
        updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_bulk_attendance(
    p_date DATE, p_employee_ids UUID[], p_status VARCHAR DEFAULT 'Present'
)
RETURNS INT AS $$
DECLARE v_count INT := 0;
DECLARE v_emp UUID;
BEGIN
    FOREACH v_emp IN ARRAY p_employee_ids LOOP
        PERFORM sp_hr_mark_attendance(v_emp, p_date, p_status);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Leave types
CREATE OR REPLACE FUNCTION sp_hr_list_leave_types()
RETURNS TABLE (
    id UUID, code VARCHAR, name VARCHAR, days_per_year INT,
    is_paid BOOLEAN, status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT lt.id, lt.code, lt.name, lt.days_per_year, lt.is_paid, lt.status
    FROM hr_leave_types lt ORDER BY lt.name;
END;
$$ LANGUAGE plpgsql;

-- Leave requests
CREATE OR REPLACE FUNCTION sp_hr_list_leave_requests(
    p_status VARCHAR DEFAULT NULL, p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID, employee_id UUID, employee_code VARCHAR, employee_name VARCHAR,
    leave_type_id UUID, leave_type_name VARCHAR,
    from_date DATE, to_date DATE, days DECIMAL, reason TEXT,
    status VARCHAR, approved_by VARCHAR, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT lr.id, lr.employee_id, e.employee_code, e.name,
           lr.leave_type_id, lt.name,
           lr.from_date, lr.to_date, lr.days, lr.reason,
           lr.status, lr.approved_by, lr.approved_at, lr.created_at
    FROM hr_leave_requests lr
    JOIN hr_employees e ON e.id = lr.employee_id
    JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
    WHERE (p_status IS NULL OR p_status = '' OR lr.status = p_status)
      AND (p_employee_id IS NULL OR lr.employee_id = p_employee_id)
    ORDER BY lr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_apply_leave(
    p_employee_id UUID, p_leave_type_id UUID,
    p_from_date DATE, p_to_date DATE, p_days DECIMAL, p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    INSERT INTO hr_leave_requests (employee_id, leave_type_id, from_date, to_date, days, reason)
    VALUES (p_employee_id, p_leave_type_id, p_from_date, p_to_date, p_days, p_reason)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_approve_leave(p_id UUID, p_approved_by VARCHAR DEFAULT 'admin')
RETURNS BOOLEAN AS $$
DECLARE v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM hr_leave_requests WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave request not found'; END IF;
    IF v_req.status <> 'Pending' THEN
        RAISE EXCEPTION 'Only pending requests can be approved';
    END IF;

    UPDATE hr_leave_requests SET
        status = 'Approved', approved_by = p_approved_by, approved_at = NOW(), updated_at = NOW()
    WHERE id = p_id;

    UPDATE hr_leave_balances SET used = used + v_req.days
    WHERE employee_id = v_req.employee_id
      AND leave_type_id = v_req.leave_type_id
      AND year = EXTRACT(YEAR FROM v_req.from_date)::INT;

    UPDATE hr_employees SET status = 'On Leave', updated_at = NOW()
    WHERE id = v_req.employee_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_reject_leave(p_id UUID, p_approved_by VARCHAR DEFAULT 'admin')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE hr_leave_requests SET
        status = 'Rejected', approved_by = p_approved_by, approved_at = NOW(), updated_at = NOW()
    WHERE id = p_id AND status = 'Pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave request not found or not pending'; END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Holidays
CREATE OR REPLACE FUNCTION sp_hr_list_holidays(p_year INT DEFAULT NULL)
RETURNS TABLE (id UUID, holiday_date DATE, name VARCHAR, year INT) AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.holiday_date, h.name, h.year
    FROM hr_holidays h
    WHERE p_year IS NULL OR h.year = p_year
    ORDER BY h.holiday_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_hr_save_holiday(
    p_id UUID, p_holiday_date DATE, p_name VARCHAR, p_year INT
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO hr_holidays (holiday_date, name, year)
        VALUES (p_holiday_date, p_name, p_year)
        RETURNING id INTO v_id;
    ELSE
        UPDATE hr_holidays SET holiday_date = p_holiday_date, name = p_name, year = p_year
        WHERE id = p_id RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Leave balances for employee
CREATE OR REPLACE FUNCTION sp_hr_leave_balances(p_employee_id UUID, p_year INT DEFAULT NULL)
RETURNS TABLE (
    leave_type_id UUID, leave_type_code VARCHAR, leave_type_name VARCHAR,
    allocated DECIMAL, used DECIMAL, balance DECIMAL
) AS $$
DECLARE v_year INT := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
BEGIN
    RETURN QUERY
    SELECT lb.leave_type_id, lt.code, lt.name,
           lb.allocated, lb.used, lb.allocated - lb.used
    FROM hr_leave_balances lb
    JOIN hr_leave_types lt ON lt.id = lb.leave_type_id
    WHERE lb.employee_id = p_employee_id AND lb.year = v_year;
END;
$$ LANGUAGE plpgsql;
