# Install GPS & Geofencing module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

Write-Host "=== Installing GPS module ===" -ForegroundColor Cyan
Write-Host "Running database\gps\schema.sql ..." -ForegroundColor Green
& $invoke -SqlFile "database\gps\schema.sql" -Database $DbName -PgUser $DbUser -PgHost $DbHost
Write-Host "GPS module installed." -ForegroundColor Green
