@echo off
setlocal
cd /d "%~dp0"
echo Stopping SKILLSETRA full-stack workspace...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Stop-Skillsetra.ps1" -Mode fullstack
pause
