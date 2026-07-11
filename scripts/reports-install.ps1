param(
    [string]$Database = "tms_pro",
    [string]$PgUser = "postgres"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptDir "Invoke-TmsPsql.ps1") -SqlFile "database\reports\stored_procedures.sql" -Database $Database -PgUser $PgUser
