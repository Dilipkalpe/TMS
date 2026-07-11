# Relocate PostgreSQL 18 data directory (Windows installer).
# Run as Administrator from an elevated PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\relocate-postgres-data.ps1 -NewDataDir "D:\DK\RDERP\TMS\db"
#
# Requires: PostgreSQL 18 service postgresql-x64-18, existing tms_pro database.

param(
    [string]$NewDataDir = "D:\DK\RDERP\TMS\db",
    [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",
    [string]$OldDataDir = "C:\Program Files\PostgreSQL\18\data",
    [string]$ServiceName = "postgresql-x64-18",
    [string]$ServiceAccount = "NT AUTHORITY\NetworkService",
    [switch]$SkipCopy
)

$ErrorActionPreference = "Stop"

function Require-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run this script as Administrator."
    }
}

Require-Admin

if (-not (Test-Path $PgBin)) {
    throw "PostgreSQL bin not found: $PgBin"
}

$NewDataDir = [System.IO.Path]::GetFullPath($NewDataDir)
if (-not (Test-Path $NewDataDir)) {
    New-Item -ItemType Directory -Path $NewDataDir -Force | Out-Null
}

Write-Host "=== PostgreSQL data relocation ==="
Write-Host "From: $OldDataDir"
Write-Host "To:   $NewDataDir"
Write-Host ""

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
    throw "Service not found: $ServiceName"
}

if ($svc.Status -eq "Running") {
    Write-Host "Stopping $ServiceName..."
    Stop-Service -Name $ServiceName -Force
    Start-Sleep -Seconds 3
}

$hasPgVersion = Test-Path (Join-Path $NewDataDir "PG_VERSION")
if (-not $SkipCopy -and -not $hasPgVersion) {
    Write-Host "Copying cluster files (robocopy)..."
    robocopy $OldDataDir $NewDataDir /E /COPY:DAT /R:2 /W:3 /NFL /NDL /NP /MT:8
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }
}
elseif ($hasPgVersion) {
    Write-Host "Target already has PG_VERSION - skipping copy."
}

Write-Host "Re-registering Windows service..."
$pgCtl = Join-Path $PgBin "pg_ctl.exe"
& $pgCtl unregister -N $ServiceName
& $pgCtl register -N $ServiceName -D $NewDataDir -S auto -w -U $ServiceAccount

$regPath = "HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-18"
if (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name "Data Directory" -Value $NewDataDir
}

Write-Host "Starting $ServiceName..."
Start-Service -Name $ServiceName
Start-Sleep -Seconds 5

$env:PGPASSWORD = "postgres"
$psql = Join-Path $PgBin "psql.exe"
$dataDir = & $psql -U postgres -d postgres -t -A -c 'SHOW data_directory;'
$dbCheck = & $psql -U postgres -d tms_pro -t -A -c 'SELECT pg_size_pretty(pg_database_size(current_database()));'

Write-Host ""
Write-Host "data_directory: $($dataDir.Trim())"
Write-Host "tms_pro size:   $($dbCheck.Trim())"
Write-Host "Done. Old cluster remains at: $OldDataDir"
Write-Host "After verifying backups, you may delete the old folder to reclaim C: space."
