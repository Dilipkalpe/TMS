-- Drop payroll functions whose return types changed in extension scripts.
-- Required before CREATE OR REPLACE when PostgreSQL cannot alter return type in place.

DROP FUNCTION IF EXISTS sp_payroll_summary();
DROP FUNCTION IF EXISTS sp_payroll_get_run(uuid);
DROP FUNCTION IF EXISTS sp_payroll_mark_paid(uuid, character varying);
DROP FUNCTION IF EXISTS sp_payroll_list_entries(uuid);
DROP FUNCTION IF EXISTS sp_payroll_get_payslip(uuid);
DROP FUNCTION IF EXISTS sp_payroll_salary_register(integer, integer);
