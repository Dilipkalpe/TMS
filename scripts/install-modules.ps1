# Install all Enterprise modules (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

$files = @(
    "database\maintenance\schema.sql",
    "database\modules\schema.sql"
)

Write-Host "=== Installing Enterprise modules ===" -ForegroundColor Cyan
foreach ($f in $files) {
    Write-Host "Running $f ..." -ForegroundColor Green
    & $invoke -SqlFile $f -Database $DbName -PgUser $DbUser -PgHost $DbHost
}
Write-Host "Enterprise modules installed. Restart TMS API to apply." -ForegroundColor Green
