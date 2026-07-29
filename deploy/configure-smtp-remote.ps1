#Requires -Version 5.1
<#
.SYNOPSIS
  Configure Gmail SMTP for TMS notifications on Contabo and restart the API.

.EXAMPLE
  .\deploy\configure-smtp-remote.ps1 -SshPassword 'YOUR_VPS_ROOT_PASSWORD'
  .\deploy\configure-smtp-remote.ps1 -IdentityFile "$env:USERPROFILE\.ssh\id_ed25519"
#>
param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms",
    [string]$SshPassword = "",
    [string]$IdentityFile = "",
    [string]$SmtpEmail = "Codeestack@gmail.com",
    [string]$SmtpPassword = "",
    [string]$SmtpFromName = "TMS Pro"
)

$ErrorActionPreference = "Stop"

if (-not $SmtpPassword) {
    $secure = Read-Host "Gmail / SMTP password (or App Password)" -AsSecureString
    $SmtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

$plink = Get-Command plink.exe -ErrorAction SilentlyContinue
$usePlink = $SshPassword -and $plink

function Invoke-Remote([string]$RemoteCommand) {
    if ($usePlink) {
        & $plink.Source -ssh -batch -pw $SshPassword "${User}@${Server}" $RemoteCommand
    }
    elseif ($IdentityFile) {
        & ssh -i $IdentityFile -o IdentitiesOnly=yes "${User}@${Server}" $RemoteCommand
    }
    else {
        & ssh "${User}@${Server}" $RemoteCommand
    }
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed with exit $LASTEXITCODE" }
}

# Escape for single-quoted bash / sed
$emailEsc = $SmtpEmail.Replace("'", "'\''")
$passEsc = $SmtpPassword.Replace("'", "'\''")
$nameEsc = $SmtpFromName.Replace("'", "'\''")

$remote = @"
set -euo pipefail
cd '$RepoDir'
ENV_FILE=deploy/.env
touch "`$ENV_FILE"
upsert() {
  local key=`$1 val=`$2
  if grep -q "^`${key}=" "`$ENV_FILE" 2>/dev/null; then
    sed -i "s|^`${key}=.*|`${key}=`${val}|" "`$ENV_FILE"
  else
    printf '%s=%s\n' "`$key" "`$val" >> "`$ENV_FILE"
  fi
}
upsert Notifications__Smtp__Host smtp.gmail.com
upsert Notifications__Smtp__Port 587
upsert Notifications__Smtp__Username '$emailEsc'
upsert Notifications__Smtp__Password '$passEsc'
upsert Notifications__Smtp__From '$emailEsc'
upsert Notifications__Smtp__FromName '$nameEsc'
upsert Notifications__Smtp__UseSsl true
echo 'SMTP keys written to deploy/.env'
# Pull compose wiring if present, then recreate API with new env
git pull --ff-only || true
docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env up -d --force-recreate tms-api
sleep 10
curl -s http://127.0.0.1:8080/api/health || curl -s http://127.0.0.1:5000/api/health || true
echo
"@

Write-Host "Configuring SMTP on ${User}@${Server} ..." -ForegroundColor Cyan
Invoke-Remote $remote
Write-Host "Done. Health should show notifications.email = configured" -ForegroundColor Green
Write-Host "If Gmail blocks login, create an App Password: https://myaccount.google.com/apppasswords" -ForegroundColor Yellow
