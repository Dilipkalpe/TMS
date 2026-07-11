# Install HR + Payroll module (uses psql auto-discovery + password from appsettings)
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

$files = @(
    "database\hr\schema.sql",
    "database\saas\tenant_hr_payroll_columns.sql",
    "database\hr\employment_types.sql",
    "database\hr\upgrade_drop_employee_sp.sql",
    "database\hr\stored_procedures.sql",
    "database\hr\seed.sql",
    "database\payroll\schema.sql",
    "database\payroll\upgrade_drop_functions.sql",
    "database\payroll\stored_procedures.sql",
    "database\payroll\accounting_integration.sql",
    "database\payroll\upgrade_drop_functions.sql",
    "database\payroll\payroll_hr_extension.sql",
    "database\payroll\payroll_accounting_sp.sql",
    "database\hr\upgrade_drop_employee_sp.sql",
    "database\hr\employment_hr_sp.sql",
    "database\payroll\upgrade_drop_transport.sql",
    "database\payroll\employment_payroll.sql",
    "database\hr\upgrade_drop_employee_sp.sql",
    "database\hr\tms_transport_hr.sql",
    "database\payroll\upgrade_drop_transport.sql",
    "database\payroll\tms_transport_payroll.sql",
    "database\saas\tenant_hr_payroll_procs.sql"
)

Write-Host "=== Installing HR & Payroll modules ===" -ForegroundColor Cyan
foreach ($f in $files) {
    Write-Host "Running $f ..." -ForegroundColor Green
    & $invoke -SqlFile $f
}
Write-Host "HR and Payroll modules installed." -ForegroundColor Green
