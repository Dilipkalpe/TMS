# TMS Pro — Performance test runner (5 lakh rows per section)
# Usage:
#   .\scripts\run-perf-test.ps1              # full 500000 per section (~3.5M rows)
#   .\scripts\run-perf-test.ps1 -Count 5000  # quick smoke test

param(
    [int]$Count = 500000,
    [string]$Db = "tms_pro",
    [string]$PgUser = "postgres",
    [switch]$SkipSeed,
    [switch]$SkipBenchmark
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== TMS Pro Performance Test ===" -ForegroundColor Cyan
Write-Host "Rows per section: $Count (~$($Count * 7) total rows)" -ForegroundColor Yellow

if (-not $SkipSeed) {
    Write-Host "`n[1/4] Seeding bulk data (this may take 15-60 min for 5 lakh/section)..." -ForegroundColor Green
    psql -U $PgUser -d $Db -v count=$Count -f "$Root\database\perf\seed_bulk.sql"
    Write-Host "`n[2/4] Adding performance indexes..." -ForegroundColor Green
    psql -U $PgUser -d $Db -f "$Root\database\perf\add_perf_indexes.sql"
} else {
    Write-Host "`n[1-2/4] Skipped seed (SkipSeed)" -ForegroundColor DarkGray
}

Write-Host "`n[3/4] Build backend..." -ForegroundColor Green
Push-Location "$Root\backend\Tms.Api"
dotnet build -v q
Pop-Location

if (-not $SkipBenchmark) {
    Write-Host "`n[4/4] Run API benchmark (ensure dotnet run is active in another terminal)..." -ForegroundColor Green
    Write-Host "Start backend if needed: cd backend\Tms.Api; dotnet run" -ForegroundColor DarkGray
    node "$Root\scripts\perf-benchmark.mjs" --runs 5
}

Write-Host "`nDone. Cleanup perf data: psql -U $PgUser -d $Db -f database\perf\cleanup_bulk.sql" -ForegroundColor Cyan
