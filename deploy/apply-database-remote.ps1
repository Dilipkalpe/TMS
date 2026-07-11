# Apply database/ SQL scripts on Contabo VPS from your Windows PC.
# Usage:
#   .\deploy\apply-database-remote.ps1
#   .\deploy\apply-database-remote.ps1 -Server 144.91.98.218 -User root

param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TMS — Apply database SQL on live server" -ForegroundColor Cyan
Write-Host " Server: ${User}@${Server}" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will be prompted for the VPS SSH password."
Write-Host ""

$remoteCmd = @"
set -e
cd '$RepoDir'
git pull --ff-only || true
chmod +x deploy/apply-all-database-sql.sh deploy/audit-and-fix-database.sh 2>/dev/null || true
bash deploy/apply-all-database-sql.sh
"@

ssh "${User}@${Server}" $remoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "FAILED — SSH or script error (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "SUCCESS — SQL scripts applied on live database." -ForegroundColor Green
Write-Host "Open: http://${Server}:8080" -ForegroundColor Green
