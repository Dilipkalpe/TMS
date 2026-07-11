# Dev API: stop stale instance, then run with hot reload (watch rebuilds without file-lock errors).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$stopScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "stop-api.ps1"

& $stopScript -Quiet

# Wait for port 5000 to release after killing dotnet watch children.
for ($i = 0; $i -lt 10; $i++) {
    $busy = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if (-not $busy) { break }
    Start-Sleep -Milliseconds 400
}
if (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Port 5000 is still in use. Run: npm run api:stop" -ForegroundColor Red
    exit 1
}
Write-Host "Starting API with dotnet watch on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

Push-Location $Root
try {
    dotnet watch run --project backend/Tms.Api --urls http://localhost:5000
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
