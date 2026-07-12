# Deploy TMS to Contabo VPS from Windows.
# Usage:
#   .\deploy\deploy-remote.ps1
#   .\deploy\deploy-remote.ps1 -Server 144.91.98.218 -User root

param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms",
    [switch]$SkipHrPayroll,
    [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TMS — Deploy to live server" -ForegroundColor Cyan
Write-Host " Server: ${User}@${Server}" -ForegroundColor Cyan
Write-Host " Repo:   $RepoDir" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will be prompted for the VPS SSH password."
Write-Host ""

$hrStep = if ($SkipHrPayroll) { "echo 'Skipping HR payroll fix'" } else { "bash deploy/fix-hr-payroll.sh" }
$dbStep = if ($SkipDatabase) { "echo 'Skipping database SQL'" } else { "echo 'Database: run apply-all-database-sql.sh separately if needed'" }

$remoteCmd = @"
set -e
cd '$RepoDir'
echo '==> Git pull'
git pull --ff-only
chmod +x deploy/force-rebuild.sh deploy/fix-hr-payroll.sh 2>/dev/null || true
$hrStep
echo '==> Rebuild API + Web'
bash deploy/force-rebuild.sh
echo '==> Health'
sleep 5
curl -fsS http://127.0.0.1:8080/api/health || curl -fsS http://127.0.0.1:8080/api/health
"@

ssh "${User}@${Server}" $remoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "FAILED — SSH or deploy error (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "SUCCESS — TMS deployed." -ForegroundColor Green
Write-Host "  http://${Server}:8080" -ForegroundColor Green
Write-Host "  http://tms.${Server}.nip.io" -ForegroundColor Green
Write-Host ""
Write-Host "Verify: curl.exe http://${Server}:8080/api/health" -ForegroundColor Yellow
