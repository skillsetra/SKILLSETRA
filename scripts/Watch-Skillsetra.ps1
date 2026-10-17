param(
  [Parameter(Mandatory = $true)][int]$OwnerPid,
  [Parameter(Mandatory = $true)][long]$OwnerStartTicks,
  [Parameter(Mandatory = $true)][int]$ApiPid,
  [Parameter(Mandatory = $true)][int]$WebPid,
  [Parameter(Mandatory = $true)][string]$Backend,
  [Parameter(Mandatory = $true)][string]$Frontend
)

# This hidden watcher is intentionally narrow: it only terminates process trees whose
# command lines still match the exact SKILLSETRA API/web paths passed by the launcher.
$ErrorActionPreference = 'SilentlyContinue'
function Get-MatchingServerProcess([int]$Id, [string]$Kind) {
  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $Id" -ErrorAction Stop
    if (-not $process) { return $null }
    $command = [string]$process.CommandLine
    $exe = [string]$process.ExecutablePath
    if ($Kind -eq 'api') {
      $pythonDir = (Join-Path $Backend '.venv\Scripts\').TrimEnd('\') + '\'
      if ($exe.StartsWith($pythonDir, [System.StringComparison]::OrdinalIgnoreCase) -and $command -match 'uvicorn.*app\.main:app') { return $process }
    } else {
      $nextPath = Join-Path $Frontend 'node_modules\next\dist\bin\next'
      if ($command.IndexOf($nextPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) { return $process }
    }
  } catch { }
  return $null
}
function Stop-MatchingServerProcess([int]$Id, [string]$Kind) {
  if (Get-MatchingServerProcess $Id $Kind) {
    try { & taskkill.exe /PID $Id /T /F 2>$null | Out-Null } catch { }
  }
}

while ($true) {
  $owner = Get-Process -Id $OwnerPid -ErrorAction SilentlyContinue
  $ownerAlive = $false
  if ($owner) {
    try { $ownerAlive = $owner.StartTime.ToUniversalTime().Ticks -eq $OwnerStartTicks } catch { }
  }
  if (-not $ownerAlive) {
    Stop-MatchingServerProcess $WebPid 'web'
    Stop-MatchingServerProcess $ApiPid 'api'
    exit 0
  }
  $api = Get-MatchingServerProcess $ApiPid 'api'
  $web = Get-MatchingServerProcess $WebPid 'web'
  if (-not $api -and -not $web) { exit 0 }
  Start-Sleep -Seconds 4
}
