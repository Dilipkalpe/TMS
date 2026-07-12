# Deploy TMS to Contabo VPS from Windows.
# Usage:
#   .\deploy\deploy-remote.ps1
#   .\deploy\deploy-remote.ps1 -Server 144.91.98.218 -User root

param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TMS - Deploy to live server" -ForegroundColor Cyan
Write-Host " Server: ${User}@${Server}" -ForegroundColor Cyan
Write-Host " Repo:   $RepoDir" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will be prompted for the VPS SSH password."
Write-Host ""

$remoteCmd = "set -e; cd $RepoDir; git pull --ff-only; chmod +x deploy/fix-employee-save.sh deploy/force-rebuild.sh; bash deploy/fix-employee-save.sh"

& ssh "${User}@${Server}" $remoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "FAILED - SSH or deploy error (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "SUCCESS - TMS deployed." -ForegroundColor Green
Write-Host "  http://${Server}:8080" -ForegroundColor Green
Write-Host "  http://tms.${Server}.nip.io" -ForegroundColor Green
Write-Host ""
Write-Host "Verify: curl.exe http://${Server}:8080/api/health" -ForegroundColor Yellow
