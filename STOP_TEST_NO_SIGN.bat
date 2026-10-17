@echo off
setlocal
cd /d "%~dp0"
echo Stopping SKILLSETRA no-sign-in test workspace...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Stop-Skillsetra.ps1" -Mode test
pause
