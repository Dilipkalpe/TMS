-- TMS Pro — HR module tables
-- Run after main schema.sql

CREATE TABLE IF NOT EXISTS hr_departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_designations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    department_id   UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    grade_level     INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active', 'Inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code       VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    employee_type       VARCHAR(20) NOT NULL DEFAULT 'Staff'
                            CHECK (employee_type IN ('Driver', 'Staff', 'Office', 'Mechanic', 'Loader')),
    department_id       UUID REFERENCES hr_departments(id) ON DELETE SET NULL,
    designation_id      UUID REFERENCES hr_designations(id) ON DELETE SET NULL,
    driver_id           VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
    email               VARCHAR(150),
    phone               VARCHAR(30),
    date_of_joining     DATE,
    date_of_birth       DATE,
    gender              VARCHAR(10),
    address             TEXT,
    bank_account        VARCHAR(50),
    bank_ifsc           VARCHAR(20),
    pan                 VARCHAR(20),
    basic_salary        DECIMAL(12,2) NOT NULL DEFAULT 0,
    hra                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    da                  DECIMAL(12,2) NOT NULL DEFAULT 0,
    conveyance          DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_allowance     DECIMAL(12,2) NOT NULL DEFAULT 0,
    advance             DECIMAL(12,2) NOT NULL DEFAULT 0,
    pf_applicable       BOOLEAN NOT NULL DEFAULT TRUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'On Leave', 'Resigned', 'Terminated')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hr_employees_dept ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS ix_hr_employees_type ON hr_employees(employee_type);
CREATE INDEX IF NOT EXISTS ix_hr_employees_driver ON hr_employees(driver_id);

CREATE TABLE IF NOT EXISTS hr_leave_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    days_per_year   INT NOT NULL DEFAULT 12,
    is_paid         BOOLEAN NOT NULL DEFAULT TRUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    leave_type_id   UUID NOT NULL REFERENCES hr_leave_types(id) ON DELETE CASCADE,
    year            INT NOT NULL,
    allocated       DECIMAL(5,1) NOT NULL DEFAULT 0,
    used            DECIMAL(5,1) NOT NULL DEFAULT 0,
    UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    leave_type_id   UUID NOT NULL REFERENCES hr_leave_types(id),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    days            DECIMAL(5,1) NOT NULL,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approved_by     VARCHAR(100),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hr_leave_requests_emp ON hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS ix_hr_leave_requests_status ON hr_leave_requests(status);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Present'
                        CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave', 'Holiday')),
    check_in        TIME,
    check_out       TIME,
    overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS ix_hr_attendance_date ON hr_attendance(attendance_date);

CREATE TABLE IF NOT EXISTS hr_holidays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date    DATE NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    year            INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
