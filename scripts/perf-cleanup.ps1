param(
    [string]$Database = "tms_pro",
    [string]$PgUser = "postgres"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptDir "Invoke-TmsPsql.ps1") -SqlFile "database\perf\cleanup_bulk.sql" -Database $Database -PgUser $PgUser
