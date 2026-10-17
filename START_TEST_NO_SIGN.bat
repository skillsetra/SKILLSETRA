@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo    SKILLSETRA - NO SIGN-IN TEST WORKSPACE
echo ============================================================
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-Skillsetra.ps1" -Mode test
if errorlevel 1 (
  echo.
  echo Start failed. Review the message above and the logs in .skillsetra-run.
  pause
  exit /b 1
)
exit /b 0
