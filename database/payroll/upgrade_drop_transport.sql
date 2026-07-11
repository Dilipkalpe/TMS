-- Drop payroll functions superseded by tms_transport_payroll.sql

DROP FUNCTION IF EXISTS sp_payroll_list_entries(uuid);
DROP FUNCTION IF EXISTS sp_payroll_get_payslip(uuid);
DROP FUNCTION IF EXISTS sp_payroll_salary_register(integer, integer);
DROP FUNCTION IF EXISTS sp_payroll_generate(integer, integer, character varying);
