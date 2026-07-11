param(
    [int]$Count = 500000,
    [string]$Database = "tms_pro",
    [string]$PgUser = "postgres",
    [string]$CompanyId = "00000000-0000-4000-8000-000000000001"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$approxTotal = $Count * 11

Write-Host "=== Demo Company bulk seed ===" -ForegroundColor Cyan
Write-Host "Company ID: $CompanyId" -ForegroundColor DarkGray
Write-Host "Rows per section: $Count (~$approxTotal total rows)" -ForegroundColor Yellow
Write-Host "This may take 15-90 minutes for 5 lakh/section. Use -Count 5000 for a quick test." -ForegroundColor DarkYellow

& (Join-Path $scriptDir "Invoke-TmsPsql.ps1") `
    -SqlFile "database\perf\seed_bulk.sql" `
    -Database $Database `
    -PgUser $PgUser `
    -Vars @{ count = $Count; company_id = $CompanyId }

Write-Host "`nDone. Optional: npm run perf:indexes" -ForegroundColor Green
Write-Host "Cleanup: npm run demo:cleanup-perf" -ForegroundColor DarkGray
