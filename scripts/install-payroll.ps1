# Install payroll module (legacy script — prefer npm run hr:install for full HR+Payroll)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

$files = @(
    "database\payroll\schema.sql",
    "database\payroll\stored_procedures.sql",
    "database\payroll\accounting_integration.sql",
    "database\payroll\payroll_accounting_sp.sql"
)

Write-Host "=== Installing Payroll module ===" -ForegroundColor Cyan
foreach ($f in $files) {
    Write-Host "Running $f ..." -ForegroundColor Green
    & $invoke -SqlFile $f -Database $DbName -PgUser $DbUser -PgHost $DbHost
}

$hrSchema = Join-Path (Split-Path -Parent $scriptDir) "database\hr\schema.sql"
if (Test-Path $hrSchema) {
    Write-Host "Installing HR extension scripts ..." -ForegroundColor Cyan
    foreach ($f in @(
        "database\hr\schema.sql",
        "database\hr\stored_procedures.sql",
        "database\hr\seed.sql",
        "database\payroll\payroll_hr_extension.sql",
        "database\hr\employment_types.sql",
        "database\hr\employment_hr_sp.sql",
        "database\payroll\employment_payroll.sql"
    )) {
        Write-Host "Running $f ..." -ForegroundColor Green
        & $invoke -SqlFile $f -Database $DbName -PgUser $DbUser -PgHost $DbHost
    }
}

Write-Host "Payroll module installed." -ForegroundColor Green
