# Install WhatsApp/SMS Notifications module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

Write-Host "=== Installing Notifications module ===" -ForegroundColor Cyan
Write-Host "Running database\notifications\schema.sql ..." -ForegroundColor Green
& $invoke -SqlFile "database\notifications\schema.sql" -Database $DbName -PgUser $DbUser -PgHost $DbHost
Write-Host "Notifications module installed (templates seeded on API startup)." -ForegroundColor Green
