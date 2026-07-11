# Runs psql against tms_pro — finds PostgreSQL bin when psql is not on PATH.
param(
    [Parameter(Mandatory = $true)]
    [string]$SqlFile,
    [string]$Database = "tms_pro",
    [string]$PgUser = "postgres",
    [string]$PgHost = "localhost",
    [hashtable]$Vars = @{}
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Set-PostgresPasswordEnv {
    if ($env:PGPASSWORD) { return }
    if ($env:TMS_PG_PASSWORD) {
        $env:PGPASSWORD = $env:TMS_PG_PASSWORD
        return
    }
    $appsettings = Join-Path $Root "backend\Tms.Api\appsettings.json"
    if (Test-Path $appsettings) {
        try {
            $json = Get-Content $appsettings -Raw | ConvertFrom-Json
            $conn = $json.ConnectionStrings.DefaultConnection
            if ($conn -match 'Password=([^;]+)') {
                $env:PGPASSWORD = $Matches[1]
                return
            }
        } catch {
            # fall through to default
        }
    }
    $env:PGPASSWORD = "postgres"
}

function Get-PsqlPath {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($ver in 18, 17, 16, 15, 14, 13) {
        $candidate = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    throw @"
psql not found.

Install PostgreSQL, or run manually:
  `"C:\Program Files\PostgreSQL\18\bin\psql.exe`" -U postgres -d tms_pro -f database\perf\<file>.sql
"@
}

$fullSql = Join-Path $Root $SqlFile
if (-not (Test-Path $fullSql)) {
    throw "SQL file not found: $fullSql"
}

$psql = Get-PsqlPath
Set-PostgresPasswordEnv
Write-Host "Using: $psql" -ForegroundColor DarkGray
Write-Host "Database: $Database  File: $SqlFile" -ForegroundColor Cyan

$args = @("-U", $PgUser, "-h", $PgHost, "-d", $Database, "-v", "ON_ERROR_STOP=1")
foreach ($key in $Vars.Keys) {
    $args += @("-v", "${key}=$($Vars[$key])")
}
$args += @("-f", $fullSql)

& $psql @args
if ($LASTEXITCODE -ne 0) {
    throw "psql failed with exit code $LASTEXITCODE (see ERROR lines above from $SqlFile)"
}
