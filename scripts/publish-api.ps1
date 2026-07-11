# Publish TMS API (Release) to publish\TMSAPI
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Out = Join-Path $Root "publish\TMSAPI"
$StopScript = Join-Path $Root "scripts\stop-api.ps1"

& $StopScript -Quiet

Write-Host "Publishing API to $Out ..." -ForegroundColor Cyan
dotnet publish (Join-Path $Root "backend\Tms.Api\Tms.Api.csproj") -c Release -o $Out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. Copy publish\TMSAPI to your API host and restart the process." -ForegroundColor Green
