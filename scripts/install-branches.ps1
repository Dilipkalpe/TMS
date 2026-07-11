# Install Multi-branch module (uses psql auto-discovery + password from appsettings)
param(
    [string]$DbName = "tms_pro",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invoke = Join-Path $scriptDir "Invoke-TmsPsql.ps1"

Write-Host "=== Installing Branches module ===" -ForegroundColor Cyan
Write-Host "Running database\branches\schema.sql ..." -ForegroundColor Green
& $invoke -SqlFile "database\branches\schema.sql" -Database $DbName -PgUser $DbUser -PgHost $DbHost
Write-Host "Branches module installed." -ForegroundColor Green
