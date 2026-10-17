param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('test', 'fullstack')]
  [string]$Mode
)

$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Frontend = Join-Path $Root 'frontend'
$Backend = Join-Path $Root 'backend'
$StateDir = Join-Path $Root '.skillsetra-run'
$Prefix = if ($Mode -eq 'test') { 'test' } else { 'fullstack' }
$stopped = [System.Collections.Generic.List[string]]::new()

function Is-SkillsetraProcess([int]$Id) {
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $Id" -ErrorAction Stop
    if (-not $proc) { return $false }
    $command = [string]$proc.CommandLine
    $exe = [string]$proc.ExecutablePath
    $pythonUnderRoot = $exe.StartsWith((Join-Path $Backend '.venv\Scripts\'), [System.StringComparison]::OrdinalIgnoreCase) -and $command -match 'uvicorn.*app\.main:app'
    $nextUnderRoot = $command.IndexOf((Join-Path $Frontend 'node_modules\next\dist\bin\next'), [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    return ($pythonUnderRoot -or $nextUnderRoot)
  } catch { return $false }
}

$targets = @(
  @{ File = "$Prefix-api.pid"; Port = 8000 },
  @{ File = "$Prefix-web.pid"; Port = 3000 }
)
foreach ($target in $targets) {
  $pidFile = Join-Path $StateDir $target.File
  $candidateIds = @()
  if (Test-Path $pidFile) {
    $raw = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue).Trim()
    $candidate = 0
    if ([int]::TryParse($raw, [ref]$candidate)) { $candidateIds += $candidate }
  }
  try {
    $listeners = @(Get-NetTCPConnection -LocalPort $target.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($listener in $listeners) { if ($listener) { $candidateIds += [int]$listener } }
  } catch {
    $listeners = @(netstat.exe -ano -p tcp 2>$null | Select-String -Pattern ":$($target.Port)\s+.*LISTENING\s+(\d+)\s*$")
    foreach ($listener in $listeners) { $candidateIds += [int]$listener.Matches[0].Groups[1].Value }
  }
  foreach ($id in @($candidateIds | Select-Object -Unique)) {
    if (Is-SkillsetraProcess ([int]$id)) {
      try {
        & taskkill.exe /PID $id /T /F 2>$null | Out-Null
        $stopped.Add("$($target.Port) (PID $id)")
      } catch { Write-Host "Could not stop PID $id. Close it from Task Manager if it is still running." -ForegroundColor Yellow }
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if ($stopped.Count -gt 0) {
  Write-Host ("Stopped Skillsetra services: " + ($stopped -join ', ')) -ForegroundColor Green
} else {
  Write-Host 'No Skillsetra service process was found for this launch mode. No unrelated process was stopped.' -ForegroundColor Yellow
}
Write-Host "Runtime logs and PID records: $StateDir"
