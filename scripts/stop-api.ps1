# Stops local Tms.Api / dotnet watch processes and frees port 5000.
param(
    [switch]$Quiet
)

$ErrorActionPreference = "SilentlyContinue"

function Write-StopMsg([string]$Message, [string]$Color = "DarkGray") {
    if (-not $Quiet) { Write-Host $Message -ForegroundColor $Color }
}

function Stop-ProcessTree([int]$ProcessId) {
    if ($ProcessId -le 0) { return }
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" |
        ForEach-Object { Stop-ProcessTree $_.ProcessId }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-TmsApiDotnetHosts {
    Get-CimInstance Win32_Process -Filter "Name='dotnet.exe'" |
        Where-Object {
            $_.CommandLine -match 'Tms\.Api' -or
            $_.CommandLine -match 'dotnet watch' -and $_.CommandLine -match 'backend\\Tms\.Api|backend/Tms\.Api'
        } |
        ForEach-Object {
            Write-StopMsg "Stopping dotnet host (PID $($_.ProcessId))..." "Yellow"
            Stop-ProcessTree $_.ProcessId
        }
}

function Stop-PortListeners([int]$Port) {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    foreach ($conn in $listeners) {
        if ($conn.OwningProcess -le 0) { continue }
        Write-StopMsg "Stopping process on port $Port (PID $($conn.OwningProcess))..." "Yellow"
        Stop-ProcessTree $conn.OwningProcess
    }
}

# Kill compiled host and any child watch processes.
$null = cmd /c "taskkill /F /IM Tms.Api.exe /T 2>nul"
Stop-TmsApiDotnetHosts
Stop-PortListeners -Port 5000

Start-Sleep -Milliseconds 600

$leftApi = @(Get-Process -Name "Tms.Api" -ErrorAction SilentlyContinue)
$leftPort = @(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue)

if ($leftApi.Count -eq 0 -and $leftPort.Count -eq 0) {
    Write-StopMsg "API stopped (port 5000 free)." "Green"
    exit 0
}

if ($leftApi.Count -gt 0) {
    Write-Warning "Tms.Api still running (PIDs: $($leftApi.Id -join ', '))."
}
if ($leftPort.Count -gt 0) {
    $pids = ($leftPort | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    Write-Warning "Port 5000 still in use (PIDs: $pids). Try: npm run api:stop"
}
exit 1
