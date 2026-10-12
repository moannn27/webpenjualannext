@echo off
title Mematikan Server Web...
cd /d "%~dp0"

echo ======================================================
echo    MEMATIKAN SEMUA SERVER & JENDELA CMD
echo ======================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-server.ps1"

:: Fallback taskkill
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /t /pid %%p >nul 2>&1
)
taskkill /f /t /fi "WINDOWTITLE eq Next.js Dev Server*" >nul 2>&1

echo.
echo [OK] Semua jendela CMD dan server telah ditutup!
ping -n 2 127.0.0.1 >nul
exit
