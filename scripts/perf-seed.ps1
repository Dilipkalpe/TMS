param(
    [int]$Count = 500000,
    [string]$Database = "tms_pro",
    [string]$PgUser = "postgres"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptDir "demo-seed-5lac.ps1") -Count $Count -Database $Database -PgUser $PgUser
