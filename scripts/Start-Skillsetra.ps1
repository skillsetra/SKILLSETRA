param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('test', 'fullstack')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Frontend = Join-Path $Root 'frontend'
$Backend = Join-Path $Root 'backend'
$StateDir = Join-Path $Root '.skillsetra-run'
$sessionDirectory = Join-Path $StateDir 'browser-sessions'
$Prefix = if ($Mode -eq 'test') { 'test' } else { 'fullstack' }
$StopName = if ($Mode -eq 'test') { 'STOP_TEST_NO_SIGN.bat' } else { 'STOP_FULLSTACK.bat' }
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
if (Test-Path $sessionDirectory) { Remove-Item $sessionDirectory -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $sessionDirectory -Force | Out-Null
$apiPidFile = Join-Path $StateDir "$Prefix-api.pid"
$webPidFile = Join-Path $StateDir "$Prefix-web.pid"
$apiOut = Join-Path $StateDir "$Prefix-api.out.log"
$apiErr = Join-Path $StateDir "$Prefix-api.err.log"
$webOut = Join-Path $StateDir "$Prefix-web.out.log"
$webErr = Join-Path $StateDir "$Prefix-web.err.log"
$apiProcess = $null
$webProcess = $null

function Fail([string]$Message) { throw $Message }
function Write-EnvFile([string]$Path, [hashtable]$Values) {
  if (-not (Test-Path $Path)) { Fail "Required environment template or file was not found: $Path" }
  $keys = @($Values.Keys | ForEach-Object { [regex]::Escape([string]$_) }) -join '|'
  $existing = @([System.IO.File]::ReadAllLines($Path) | Where-Object { $_ -notmatch "^\s*(?:$keys)\s*=" })
  foreach ($key in $Values.Keys) { $existing += "$key=$($Values[$key])" }
  [System.IO.File]::WriteAllLines($Path, [string[]]$existing, [System.Text.UTF8Encoding]::new($false))
}
function Port-Listeners([int]$Port) {
  try { return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) }
  catch {
    $lines = @(netstat.exe -ano -p tcp 2>$null | Select-String -Pattern ":$Port\s+.*LISTENING\s+(\d+)\s*$")
    return @($lines | ForEach-Object { [int]$_.Matches[0].Groups[1].Value } | Select-Object -Unique)
  }
}
function Wait-ForUrl([string]$Url, [int]$TimeoutSeconds, [System.Diagnostics.Process]$Process, [string]$Label) {
  for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
    if ($Process) { $Process.Refresh(); if ($Process.HasExited) { Fail "$Label exited before becoming ready. See $StateDir for logs." } }
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $Url | Out-Null; return }
    catch { Start-Sleep -Seconds 1 }
  }
  Fail "$Label did not become ready within $TimeoutSeconds seconds. See $StateDir for logs."
}
function Stop-StartedProcess([System.Diagnostics.Process]$Process) {
  if ($Process -and -not $Process.HasExited) {
    try { & taskkill.exe /PID $Process.Id /T /F | Out-Null } catch { try { $Process.Kill() } catch {} }
  }
}

try {
  Write-Host ''
  if ($Mode -eq 'test') { Write-Host 'SKILLSETRA · No-sign-in test workspace' -ForegroundColor Cyan }
  else { Write-Host 'SKILLSETRA · Full-stack (demo disabled)' -ForegroundColor Cyan }
  Write-Host 'Checking runtimes and preparing the local services...' -ForegroundColor Gray

  if (-not (Test-Path (Join-Path $Frontend 'package.json'))) { Fail 'frontend\package.json is missing. Extract the complete ZIP into a normal folder first.' }
  if (-not (Test-Path (Join-Path $Backend 'requirements.txt'))) { Fail 'backend\requirements.txt is missing. Extract the complete ZIP into a normal folder first.' }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) { $nodeCommand = Get-Command node -ErrorAction SilentlyContinue }
  if (-not $nodeCommand) { Fail 'Node.js was not found. Install Node.js 20 or newer, then reopen this BAT file.' }
  $nodeMajor = [int]((& $nodeCommand.Source -p "process.versions.node.split('.')[0]") | Select-Object -First 1)
  if ($nodeMajor -lt 20) { Fail "Node.js 20+ is required. Detected major version $nodeMajor." }

  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npmCommand) { Fail 'npm.cmd was not found. Reinstall Node.js with npm included.' }
  $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
  if (-not $pythonCommand) { $pythonCommand = Get-Command python -ErrorAction SilentlyContinue }
  if (-not $pythonCommand) { Fail 'Python 3.10 or newer was not found. Install Python and enable Add Python to PATH.' }
  $pythonVersion = (& $pythonCommand.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" | Select-Object -First 1)
  $parts = $pythonVersion.Trim().Split('.')
  if (($parts.Count -lt 2) -or ([int]$parts[0] -lt 3) -or (([int]$parts[0] -eq 3) -and ([int]$parts[1] -lt 10))) {
    Fail "Python 3.10+ is required. Detected version $pythonVersion."
  }

  foreach ($port in @(8000, 3000)) {
    $listeners = @(Port-Listeners $port)
    if ($listeners.Count -gt 0) { Fail "Port $port is already in use (PID $($listeners -join ', ')). Run $StopName first, or close the application using that port." }
  }

  $venvPython = Join-Path $Backend '.venv\Scripts\python.exe'
  if (-not (Test-Path $venvPython)) {
    Write-Host 'Creating Python virtual environment...' -ForegroundColor Yellow
    & $pythonCommand.Source -m venv (Join-Path $Backend '.venv')
    if ($LASTEXITCODE -ne 0) { Fail 'Python could not create backend\.venv. Check the Python installation and folder permissions.' }
  }
  $requirements = Join-Path $Backend 'requirements.txt'
  $requirementsHash = (Get-FileHash -Algorithm SHA256 $requirements).Hash
  $requirementsMarker = Join-Path $Backend '.venv\.skillsetra-requirements.sha256'
  $installedHash = if (Test-Path $requirementsMarker) { (Get-Content $requirementsMarker -Raw).Trim() } else { '' }
  if (-not (Test-Path (Join-Path $Backend '.venv\Scripts\uvicorn.exe')) -or $installedHash -ne $requirementsHash) {
    Write-Host 'Installing backend packages (first start, or requirements changed)...' -ForegroundColor Yellow
    & $venvPython -m pip install --disable-pip-version-check --upgrade pip
    if ($LASTEXITCODE -ne 0) { Fail 'Could not update pip in backend\.venv. Check internet access and retry.' }
    & $venvPython -m pip install --disable-pip-version-check -r $requirements
    if ($LASTEXITCODE -ne 0) { Fail 'Backend dependencies could not be installed. See the error above, then rerun the BAT.' }
    [System.IO.File]::WriteAllText($requirementsMarker, $requirementsHash, [System.Text.UTF8Encoding]::new($false))
  }

  $nextBin = Join-Path $Frontend 'node_modules\next\dist\bin\next'
  if (-not (Test-Path $nextBin)) {
    Write-Host 'Installing frontend packages (first start)...' -ForegroundColor Yellow
    Push-Location $Frontend
    $npmInstallLog = Join-Path $StateDir "$Prefix-npm-install.log"
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      # Windows PowerShell can convert text written by npm to stderr (including ordinary
      # deprecation warnings) into PowerShell ErrorRecords. With the script-wide
      # Stop preference, a harmless warning can abort startup before npm has finished.
      # Continue only for this external npm process, capture its true exit code, and
      # still fail startup if npm itself returns a non-zero exit code.
      $ErrorActionPreference = 'Continue'
      & $npmCommand.Source install --no-audit --no-fund 2>&1 | Tee-Object -FilePath $npmInstallLog
      $npmInstallExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
      Pop-Location
    }
    if ($npmInstallExitCode -ne 0) {
      Fail "Frontend dependency installation failed (npm exit code $npmInstallExitCode). Review $npmInstallLog for the actual error, then rerun the BAT."
    }
  }
  if (-not (Test-Path $nextBin)) { Fail 'Next.js was not installed correctly. Delete frontend\node_modules and rerun this BAT with internet access.' }

  $backendEnv = Join-Path $Backend '.env'
  $frontendEnv = Join-Path $Frontend '.env.local'
  if (-not (Test-Path $backendEnv)) { Copy-Item (Join-Path $Backend '.env.example') $backendEnv }
  if (-not (Test-Path $frontendEnv)) { Copy-Item (Join-Path $Frontend '.env.example') $frontendEnv }
  $demoValue = if ($Mode -eq 'test') { 'true' } else { 'false' }
  $environmentValue = if ($Mode -eq 'test') { 'demo' } else { 'development' }
  Write-EnvFile $backendEnv @{
    DEMO_MODE = $demoValue
    ENVIRONMENT = $environmentValue
    AI_PROVIDER = 'puter'
    PUTER_MODEL = 'openai/gpt-oss-20b'
    CORS_ORIGINS = 'http://localhost:3000'
  }
  Write-EnvFile $frontendEnv @{
    NEXT_PUBLIC_DEMO_MODE = $demoValue
    NEXT_PUBLIC_API_BASE_URL = ''
    BACKEND_INTERNAL_URL = 'http://127.0.0.1:8000'
  }

  # Set values in this launch process as well: inherited machine-level environment variables
  # must not override the mode selected by the explicit launcher.
  $env:DEMO_MODE = $demoValue
  $env:ENVIRONMENT = $environmentValue
  $env:AI_PROVIDER = 'puter'
  $env:PUTER_MODEL = 'openai/gpt-oss-20b'
  $env:CORS_ORIGINS = 'http://localhost:3000'
  $env:NEXT_PUBLIC_DEMO_MODE = $demoValue
  $env:NEXT_PUBLIC_API_BASE_URL = ''
  $env:BACKEND_INTERNAL_URL = 'http://127.0.0.1:8000'

  $nextCache = Join-Path $Frontend '.next'
  if (Test-Path $nextCache) { Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue }
  foreach ($log in @($apiOut, $apiErr, $webOut, $webErr)) { if (Test-Path $log) { Remove-Item $log -Force -ErrorAction SilentlyContinue } }

  Write-Host 'Starting API server...' -ForegroundColor Yellow
  $apiProcess = Start-Process -FilePath $venvPython -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $Backend -PassThru -WindowStyle Hidden -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr
  [System.IO.File]::WriteAllText($apiPidFile, [string]$apiProcess.Id, [System.Text.UTF8Encoding]::new($false))
  Wait-ForUrl 'http://127.0.0.1:8000/api/v1/health' 75 $apiProcess 'Backend API'

  Write-Host 'Starting Next.js web server...' -ForegroundColor Yellow
  $webArguments = '"' + $nextBin + '" dev --hostname 127.0.0.1 --port 3000'
  $webProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList $webArguments -WorkingDirectory $Frontend -PassThru -WindowStyle Hidden -RedirectStandardOutput $webOut -RedirectStandardError $webErr
  [System.IO.File]::WriteAllText($webPidFile, [string]$webProcess.Id, [System.Text.UTF8Encoding]::new($false))

  # Detached services are watched by a tiny companion. If this launcher console is closed,
  # the companion shuts down only the two service process trees created for this run.
  $ownerStartTicks = (Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks
  $watcherScript = Join-Path $PSScriptRoot 'Watch-Skillsetra.ps1'
  $watcherArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$watcherScript`" -OwnerPid $PID -OwnerStartTicks $ownerStartTicks -ApiPid $($apiProcess.Id) -WebPid $($webProcess.Id) -Backend `"$Backend`" -Frontend `"$Frontend`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $watcherArguments -WindowStyle Hidden | Out-Null

  Wait-ForUrl 'http://127.0.0.1:3000/' 120 $webProcess 'Next.js web app'
  Start-Process 'http://localhost:3000/' | Out-Null
  Write-Host ''
  Write-Host 'SKILLSETRA IS RUNNING: http://localhost:3000/' -ForegroundColor Green
  if ($Mode -eq 'test') {
    Write-Host 'No sign-in is required in this local test workspace.' -ForegroundColor Green
    Write-Host 'Puter AI features require internet access in your browser.' -ForegroundColor Gray
  } else {
    Write-Host 'Demo mode is OFF. Configure Supabase URL and public anon key in frontend\.env.local for sign-in.' -ForegroundColor Yellow
  }
  Write-Host "Logs: $StateDir"
  Write-Host 'Local services stop automatically shortly after the last SKILLSETRA browser tab closes.' -ForegroundColor Cyan
  Write-Host "Manual fallback: $StopName"

  # Each browser tab owns a marker. Page-hide removes the marker promptly; a short
  # grace window protects a normal reload, while stale timestamps cover missed beacons.
  $firstClientDeadline = [DateTime]::UtcNow.AddMinutes(5)
  $clientSessionSeen = $false
  $noSessionSince = $null
  while ($true) {
    $apiProcess.Refresh(); $webProcess.Refresh()
    if ($apiProcess.HasExited -or $webProcess.HasExited) {
      Write-Host 'A SKILLSETRA service has stopped; cleaning up the remaining service...' -ForegroundColor Yellow
      Stop-StartedProcess $webProcess
      Stop-StartedProcess $apiProcess
      Remove-Item $webPidFile, $apiPidFile -Force -ErrorAction SilentlyContinue
      break
    }

    $activeSessions = @()
    foreach ($markerFile in @(Get-ChildItem -Path $sessionDirectory -Filter 'browser-*.txt' -File -ErrorAction SilentlyContinue)) {
      if (([DateTime]::UtcNow - $markerFile.LastWriteTimeUtc).TotalSeconds -lt 105) {
        $activeSessions += $markerFile
      } else {
        Remove-Item $markerFile.FullName -Force -ErrorAction SilentlyContinue
      }
    }

    if ($activeSessions.Count -gt 0) {
      $clientSessionSeen = $true
      $noSessionSince = $null
    } elseif ($clientSessionSeen) {
      if ($null -eq $noSessionSince) { $noSessionSince = [DateTime]::UtcNow }
      elseif (([DateTime]::UtcNow - $noSessionSince).TotalSeconds -ge 20) {
        Write-Host 'All SKILLSETRA browser tabs are closed. Stopping both local services and releasing ports...' -ForegroundColor Yellow
        Stop-StartedProcess $webProcess
        Stop-StartedProcess $apiProcess
        Remove-Item $webPidFile, $apiPidFile -Force -ErrorAction SilentlyContinue
        if (Test-Path $sessionDirectory) { Remove-Item $sessionDirectory -Recurse -Force -ErrorAction SilentlyContinue }
        break
      }
    }
    if (-not $clientSessionSeen -and [DateTime]::UtcNow -gt $firstClientDeadline) {
      Write-Host 'No browser session connected within five minutes. Stopping local services to release the ports.' -ForegroundColor Yellow
      Stop-StartedProcess $webProcess
      Stop-StartedProcess $apiProcess
      Remove-Item $webPidFile, $apiPidFile -Force -ErrorAction SilentlyContinue
      if (Test-Path $sessionDirectory) { Remove-Item $sessionDirectory -Recurse -Force -ErrorAction SilentlyContinue }
      break
    }
    Start-Sleep -Seconds 5
  }
  exit 0
}
catch {
  Write-Host ''
  Write-Host ("STARTUP ERROR: " + $_.Exception.Message) -ForegroundColor Red
  foreach ($log in @($apiErr, $apiOut, $webErr, $webOut, (Join-Path $StateDir "$Prefix-npm-install.log"))) {
    if (Test-Path $log) {
      Write-Host "--- Last lines of $log ---" -ForegroundColor DarkYellow
      Get-Content $log -Tail 22 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
    }
  }
  Stop-StartedProcess $webProcess
  Stop-StartedProcess $apiProcess
  Remove-Item $webPidFile, $apiPidFile -Force -ErrorAction SilentlyContinue
  Write-Host "Full logs are in: $StateDir" -ForegroundColor Gray
  exit 1
}
