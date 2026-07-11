# Install AI Route Optimization module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

Write-Host "=== Installing Route Optimization module ===" -ForegroundColor Cyan
Write-Host "Running database\routing\schema.sql ..." -ForegroundColor Green
& $invoke -SqlFile "database\routing\schema.sql" -Database $DbName -PgUser $DbUser -PgHost $DbHost
Write-Host "Route Optimization module installed." -ForegroundColor Green
