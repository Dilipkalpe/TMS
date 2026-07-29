#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy TMS Pro to Contabo VPS over SSH (git pull + Docker rebuild).

.DESCRIPTION
  Supports password auth (PuTTY plink preferred, or OpenSSH ASKPASS) and SSH keys.
  Optionally writes Gmail SMTP settings into deploy/.env before rebuild.

.EXAMPLE
  # Password (PuTTY plink recommended)
  .\deploy\deploy-remote.ps1 -Password 'YOUR_VPS_ROOT_PASSWORD'

.EXAMPLE
  # SSH key
  .\deploy\deploy-remote.ps1 -IdentityFile "$env:USERPROFILE\.ssh\id_ed25519"

.EXAMPLE
  # Deploy + configure Gmail SMTP in one step
  .\deploy\deploy-remote.ps1 -Password 'YOUR_VPS_ROOT_PASSWORD' `
    -ConfigureSmtp `
    -SmtpEmail 'Codeestack@gmail.com' `
    -SmtpPassword 'YOUR_GMAIL_OR_APP_PASSWORD'

.EXAMPLE
  # Skip full rebuild (API recreate only after env change)
  .\deploy\deploy-remote.ps1 -Password 'YOUR_VPS_ROOT_PASSWORD' -QuickApiOnly
#>
param(
    [string]$Server = "144.91.98.218",
    [string]$User = "root",
    [string]$RepoDir = "/var/www/tms",
    [string]$Password = "",
    [string]$IdentityFile = "",
    [switch]$ConfigureSmtp,
    [string]$SmtpEmail = "Codeestack@gmail.com",
    [string]$SmtpPassword = "",
    [string]$SmtpFromName = "TMS Pro",
    [switch]$QuickApiOnly,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-SshBaseArgs {
    $args = @(
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ConnectTimeout=45",
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=120"
    )
    if ($IdentityFile -and (Test-Path $IdentityFile)) {
        $args += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
    }
    if (-not $script:InteractivePassword) {
        $args += @("-o", "BatchMode=yes")
    }
    return $args
}

function Invoke-Ssh([string]$RemoteCommand) {
    if ($script:UsePlink) {
        $pa = @("-batch", "-ssh", "${User}@${Server}")
        if ($Password) { $pa += @("-pw", $Password) }
        if ($IdentityFile) { $pa += @("-i", $IdentityFile) }
        $pa += $RemoteCommand
        $out = & $script:PlinkPath @pa 2>&1
        if ($LASTEXITCODE -ne 0) { throw "SSH/plink failed ($LASTEXITCODE): $out" }
        return ($out | Out-String)
    }

    $sa = Get-SshBaseArgs
    $out = & ssh @sa "${User}@${Server}" $RemoteCommand 2>&1
    if ($LASTEXITCODE -ne 0) { throw "SSH failed ($LASTEXITCODE): $out" }
    return ($out | Out-String)
}

function Escape-BashSingle([string]$Value) {
    if ($null -eq $Value) { return "" }
    return $Value.Replace("'", "'\''")
}

# ---- banner ----
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " TMS Pro - Deploy to Contabo (SSH)" -ForegroundColor Cyan
Write-Host " Server: ${User}@${Server}" -ForegroundColor Cyan
Write-Host " Repo:   $RepoDir" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ---- auth ----
$script:UsePlink = $false
$script:PlinkPath = $null
$script:InteractivePassword = $false
$script:AskPassFile = $null
$plinkCmd = Get-Command plink.exe -ErrorAction SilentlyContinue

if (-not $Password -and -not $IdentityFile) {
    $secure = Read-Host "VPS SSH password for ${User}@${Server}" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

if ($Password -and $plinkCmd) {
    $script:UsePlink = $true
    $script:PlinkPath = $plinkCmd.Source
    Write-Host "Auth mode: plink + password" -ForegroundColor Yellow
}
elseif ($IdentityFile) {
    if (-not (Test-Path $IdentityFile)) { throw "IdentityFile not found: $IdentityFile" }
    Write-Host "Auth mode: SSH private key" -ForegroundColor Yellow
}
elseif ($Password) {
    $script:InteractivePassword = $true
    $askPass = Join-Path $env:TEMP ("tms_deploy_askpass_{0}.cmd" -f $stamp)
    @"
@echo off
echo $($Password.Replace('%','%%'))
"@ | Set-Content -LiteralPath $askPass -Encoding ASCII
    $env:SSH_ASKPASS = $askPass
    $env:SSH_ASKPASS_REQUIRE = "force"
    $env:DISPLAY = "localhost:0"
    $script:AskPassFile = $askPass
    Write-Host "Auth mode: OpenSSH ASKPASS" -ForegroundColor Yellow
    Write-Host "NOTE: If auth fails, install PuTTY (plink) or use -IdentityFile." -ForegroundColor DarkYellow
}
else {
    throw "Provide -Password or -IdentityFile."
}

try {
    # ---- optional SMTP ----
    $smtpBlock = ""
    if ($ConfigureSmtp) {
        if (-not $SmtpPassword) {
            $secureSmtp = Read-Host "Gmail SMTP password (or App Password)" -AsSecureString
            $SmtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSmtp))
        }
        $emailEsc = Escape-BashSingle $SmtpEmail
        $passEsc = Escape-BashSingle $SmtpPassword
        $nameEsc = Escape-BashSingle $SmtpFromName
        $smtpBlock = @"

echo '==> Configure SMTP in deploy/.env'
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
echo 'SMTP keys written'
"@
        Write-Host "SMTP will be configured for: $SmtpEmail" -ForegroundColor Yellow
    }

    if ($QuickApiOnly) {
        $buildBlock = @"
echo '==> Quick recreate tms-api (no full --no-cache rebuild)'
if [ -f deploy/.env ]; then
  docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env up -d --force-recreate tms-api
else
  docker compose -f deploy/docker-compose.vps.yml up -d --force-recreate tms-api
fi
"@
    }
    else {
        $buildBlock = @"
echo '==> Full rebuild (API + Web)'
chmod +x deploy/force-rebuild.sh deploy/patch-hr-get-employee.sh 2>/dev/null || true
if [ -f deploy/.env ]; then
  docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env build --no-cache tms-api tms-web
  docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env up -d tms-api tms-web
else
  bash deploy/force-rebuild.sh
fi
"@
    }

    $remoteCmd = @"
set -euo pipefail
cd '$RepoDir'
echo '==> git pull'
git pull --ff-only
$smtpBlock
$buildBlock
echo '==> Waiting for API...'
sleep 12
echo '==> Health check'
curl -fsS http://127.0.0.1:8080/api/health || curl -fsS http://127.0.0.1:5000/api/health || true
echo
echo 'DEPLOY_OK'
"@

    Write-Step "Connecting and deploying (this can take 5–15 minutes)..."
    $result = Invoke-Ssh $remoteCmd
    Write-Host $result

    if ($result -notmatch "DEPLOY_OK") {
        throw "Remote deploy finished without DEPLOY_OK marker. Check output above."
    }

    if (-not $SkipHealthCheck) {
        Write-Step "Public health check"
        try {
            $health = & curl.exe -fsS "http://${Server}:8080/api/health" 2>&1
            Write-Host $health
        }
        catch {
            Write-Host "Public health check failed (API may still be starting): $_" -ForegroundColor DarkYellow
        }
    }

    Write-Host ""
    Write-Host "SUCCESS - TMS deployed." -ForegroundColor Green
    Write-Host "  http://${Server}:8080" -ForegroundColor Green
    Write-Host "  http://tms.${Server}.nip.io" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify: curl.exe http://${Server}:8080/api/health" -ForegroundColor Yellow
    if ($ConfigureSmtp) {
        Write-Host "Expect notifications.email = configured in health JSON." -ForegroundColor Yellow
        Write-Host "If Gmail rejects login, use an App Password: https://myaccount.google.com/apppasswords" -ForegroundColor Yellow
    }
}
finally {
    if ($script:AskPassFile -and (Test-Path $script:AskPassFile)) {
        Remove-Item -LiteralPath $script:AskPassFile -Force -ErrorAction SilentlyContinue
    }
    Remove-Item Env:SSH_ASKPASS -ErrorAction SilentlyContinue
    Remove-Item Env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
}
