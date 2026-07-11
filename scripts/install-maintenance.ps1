# Install Predictive Maintenance module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

$files = @(
    "database\maintenance\install.sql"
)

Write-Host "=== Installing Predictive Maintenance module ===" -ForegroundColor Cyan
foreach ($f in $files) {
    Write-Host "Running $f ..." -ForegroundColor Green
    & $invoke -SqlFile $f -Database $DbName -PgUser $DbUser -PgHost $DbHost
}
Write-Host "Predictive Maintenance module installed." -ForegroundColor Green
