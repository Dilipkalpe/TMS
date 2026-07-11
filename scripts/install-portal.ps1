# Install Customer Tracking Portal module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

Write-Host "=== Installing Customer Portal module ===" -ForegroundColor Cyan
Write-Host "Running database\portal\schema.sql ..." -ForegroundColor Green
& $invoke -SqlFile "database\portal\schema.sql" -Database $DbName -PgUser $DbUser -PgHost $DbHost
Write-Host "Portal module installed (demo access seeded on API startup for C-001, PIN 123456)." -ForegroundColor Green
