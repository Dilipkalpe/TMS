#!/usr/bin/env bash
# Installs sp_hr_get_employee(company_id, id) on live DB — no Docker rebuild needed.
# Run on VPS: bash deploy/patch-hr-get-employee.sh
set -euo pipefail

DB_USER="${DB_USER:-tms}"
DB_NAME="${DB_NAME:-tms_pro}"
PG=$(docker ps -q -f name=postgres | head -1)

if [ -z "$PG" ]; then
  echo "ERROR: postgres container not found"
  exit 1
fi

echo "==> Installing sp_hr_get_employee(uuid, uuid) on $DB_NAME"

docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
DROP FUNCTION IF EXISTS sp_hr_get_employee(uuid);

CREATE OR REPLACE FUNCTION sp_hr_get_employee(p_company_id UUID, p_id UUID)
RETURNS TABLE (
    id UUID, employee_code VARCHAR, name VARCHAR, employee_type VARCHAR,
    employment_type VARCHAR, department_id UUID, department_name VARCHAR,
    designation_id UUID, designation_name VARCHAR,
    driver_id VARCHAR, email VARCHAR, phone VARCHAR,
    date_of_joining DATE, date_of_birth DATE, gender VARCHAR, address TEXT,
    bank_account VARCHAR, bank_ifsc VARCHAR, pan VARCHAR,
    basic_salary DECIMAL, daily_wage DECIMAL, hra DECIMAL, da DECIMAL,
    conveyance DECIMAL, other_allowance DECIMAL, advance DECIMAL,
    pf_applicable BOOLEAN, esi_applicable BOOLEAN, insurance_applicable BOOLEAN,
    insurance_amount DECIMAL, contract_end_date DATE,
    license_number VARCHAR, license_expiry DATE, assigned_vehicle_id VARCHAR,
    route_allowance DECIMAL, fuel_allowance DECIMAL, loading_allowance DECIMAL,
    halting_allowance DECIMAL, driver_bhatta DECIMAL,
    status VARCHAR, created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.employee_code, e.name, e.employee_type, COALESCE(e.employment_type, 'Permanent'),
           e.department_id, d.name, e.designation_id, g.name, e.driver_id, e.email, e.phone,
           e.date_of_joining, e.date_of_birth, e.gender, e.address, e.bank_account, e.bank_ifsc, e.pan,
           e.basic_salary, COALESCE(e.daily_wage, 0), e.hra, e.da, e.conveyance, e.other_allowance, e.advance,
           e.pf_applicable, COALESCE(e.esi_applicable, FALSE), COALESCE(e.insurance_applicable, TRUE),
           COALESCE(e.insurance_amount, 0), e.contract_end_date,
           e.license_number, e.license_expiry, e.assigned_vehicle_id,
           COALESCE(e.route_allowance, 0), COALESCE(e.fuel_allowance, 0),
           COALESCE(e.loading_allowance, 0), COALESCE(e.halting_allowance, 0), COALESCE(e.driver_bhatta, 0),
           e.status, e.created_at
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id AND d.company_id = p_company_id
    LEFT JOIN hr_designations g ON g.id = e.designation_id
    WHERE e.id = p_id AND e.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;
SQL

echo ""
docker exec -i "$PG" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT proname || '(' || pronargs || ' args)' FROM pg_proc WHERE proname = 'sp_hr_get_employee';"

echo ""
echo "Done. Refresh HR employee page — Load should work now."
