#Requires -Version 5.1
<#
.SYNOPSIS
  Push deploy scripts and run native Contabo deploy over SSH (no Docker).

.EXAMPLE
  .\deploy\deploy-remote-native.ps1 -Password 'ROOT_PASSWORD'
  .\deploy\deploy-remote-native.ps1 -IdentityFile "$env:USERPROFILE\.ssh\id_ed25519"
#>
param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms",
    [string]$Password = "",
    [string]$IdentityFile = "",
    [string]$PgPassword = "",
    [string]$ConnectionString = "",
    [string]$CustomDomain = "",
    [string]$JwtKey = ""
)

$ErrorActionPreference = "Stop"
$plink = Get-Command plink.exe -ErrorAction SilentlyContinue

function Invoke-Remote([string]$Cmd) {
    if ($Password -and $plink) {
        & $plink.Source -batch -ssh "${User}@${Server}" -pw $Password $Cmd
        if ($LASTEXITCODE -ne 0) { throw "Remote command failed ($LASTEXITCODE)" }
        return
    }
    $sa = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")
    if ($IdentityFile) { $sa += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes") }
    if (-not $Password -and -not $IdentityFile) { $sa += @("-o", "BatchMode=yes") }
    if ($Password -and -not $plink) {
        $env:SSH_ASKPASS_REQUIRE = "force"
        $ask = Join-Path $env:TEMP "tms_askpass.cmd"
        "@echo off`r`necho $Password" | Set-Content -Path $ask -Encoding ASCII
        $env:SSH_ASKPASS = $ask
        $env:DISPLAY = "localhost:0"
    }
    & ssh @sa "${User}@${Server}" $Cmd
    if ($LASTEXITCODE -ne 0) { throw "SSH failed ($LASTEXITCODE)" }
}

if (-not $Password -and -not $IdentityFile) {
    Write-Host "Provide -Password or -IdentityFile for Contabo root access." -ForegroundColor Yellow
    exit 1
}

$exports = @()
if ($ConnectionString) { $exports += "export TMS_CONNECTION_STRING='$ConnectionString'" }
if ($PgPassword) { $exports += "export PG_PASSWORD='$PgPassword'" }
if ($JwtKey) { $exports += "export TMS_JWT_KEY='$JwtKey'" }
if ($CustomDomain) { $exports += "export CUSTOM_DOMAIN='$CustomDomain'" }
$exports += "export PUBLIC_HOST='tms.144.91.98.218.nip.io'"
$prefix = ($exports -join "; ")

Write-Host "==> Running native Contabo deploy on $Server ..." -ForegroundColor Cyan
$remote = @"
set -euo pipefail
cd '$RepoDir'
git fetch --all --prune || true
git pull --ff-only || true
chmod +x deploy/deploy-native-contabo.sh
$prefix
bash deploy/deploy-native-contabo.sh
"@

Invoke-Remote $remote
Write-Host "==> Done. Open http://tms.144.91.98.218.nip.io/login" -ForegroundColor Green
